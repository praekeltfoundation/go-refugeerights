// Find and replace these characters: ’‘

go.app = function() {
    var vumigo = require('vumigo_v02');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var Q = require('q');
    var _ = require('lodash');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var PaginatedState = vumigo.states.PaginatedState;
    var EndState = vumigo.states.EndState;
    var FreeText = vumigo.states.FreeText;
    var location = require('go-jsbox-location');
    var LocationState = location.LocationState;
    var OpenStreetMap = location.providers.openstreetmap.OpenStreetMap;


    var GoRR = App.extend(function(self) {
        App.call(self, 'state_start');
        var $ = self.$;
        var interrupt = true;

        self.init = function() {

            // Use the metrics helper to add some metrics
            mh = new MetricsHelper(self.im);
            mh
                // Total unique users
                .add.total_unique_users('total.ussd.unique_users')

                // Total sessions
                .add.total_sessions('total.ussd.sessions')

                // Total times reached state_timed_out
                .add.total_state_actions(
                    {
                        state: 'state_timed_out',
                        action: 'enter'
                    },
                    'total.reached_state_timed_out'
                );

            // Record returning users metrics
            self.im.on('session:new', function(e) {
                return go.utils.fire_returning_user_metrics(self.im, self.contact);
            });

            // Send a dial back reminder via sms the first time someone times out
            self.im.on('session:close', function(e) {
                return go.utils.eval_dialback_reminder(e, self.im, self.contact, $);
            });

            // Load self.contact
            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                   self.contact = user_contact;
                });
        };


    // TIMEOUT HANDLING

        // override normal state adding
        self.add = function(name, creator) {
            self.states.add(name, function(name, opts) {
                if (!interrupt || !go.utils.timed_out(self.im))
                    return creator(name, opts);

                interrupt = false;
                opts = opts || {};
                opts.name = name;
                return self.states.create('state_timed_out', opts);
            });
        };

        // timeout 01
        self.states.add('state_timed_out', function(name, creator_opts) {

            return new ChoiceState(name, {
                question: $("Select an option:"),
                choices: [
                    new Choice('continue', $("Return to where I left off")),
                    new Choice('info', $("Find more info")),
                    new Choice('xenophobia', $("Report xenophobia")),
                    new Choice('arrest', $("Report unlawful arrest")),
                    new Choice('corruption', $("Report corruption")),
                    new Choice('other', $("Report something else")),
                ],

                next: function(choice) {
                    return go.utils
                        .track_redials(self.contact, self.im, choice.value)
                        .then(function() {
                            if (choice.value === 'continue') {
                                return {
                                    name: creator_opts.name,
                                    creator_opts: creator_opts
                                };
                                // return creator_opts.name;
                            } else if (choice.value === 'info') {
                                return 'state_main';
                            } else {
                                self.contact.extra.report_theme = choice.value;
                                return self.im.contacts
                                    .save(self.contact)
                                    .then(function() {
                                        return 'state_report_legal';
                                    });
                            }
                        });
                }
            });
        });


    // START STATES

        // delegator 1
        self.add('state_start', function(name) {
            var status = self.contact.extra.status;
            return go.utils
                .set_language(self.im, self.contact)
                .then(function() {
                    if (status === 'refugee' || status === 'migrant') {
                        return self.states.create('state_registered_landing');
                    } else if (self.contact.extra.consent !== undefined) {
                        return self.states.create('state_unregistered_menu');
                    } else {
                        return self.states.create('state_language');
                    }
                });
        });

        // delegator 2
        self.add('state_main', function(name) {
            var status = self.contact.extra.status;
                if (status === 'refugee') {
                    return self.states.create('state_refugee_main');
                } else if (status === 'migrant') {
                    return self.states.create('state_migrant_main');
                } else {
                    return self.states.create('state_country');
                }
        });

        self.add('state_registered_landing', function(name) {
            return new ChoiceState(name, {
                question: $("Select an option:"),
                choices: [
                    new Choice('more_info', $("Find more info")),
                    new Choice('xenophobia', $("Report xenophobia")),
                    new Choice('arrest', $("Report unlawful arrest")),
                    new Choice('corruption', $("Report corruption")),
                    new Choice('other', $("Report something else")),
                ],
                next: function(choice) {
                    if (choice.value === 'more_info') {
                        return 'state_main';
                    } else {
                        self.contact.extra.report_theme = choice.value;
                        return self.im.contacts
                            .save(self.contact)
                            .then(function() {
                                return 'state_report_legal';
                            });
                    }
                }
            });
        });


    // REGISTRATION STATES

        self.add('state_language', function(name) {
            return new ChoiceState(name, {
                question: $("Welcome! Would you like to find out about refugee and migrant rights in SA? First select your language:"),
                choices: [
                    new Choice('en', $("English")),
                    new Choice('fr', $("French")),
                    new Choice('sw', $("Swahili")),
                    new Choice('so', $("Somali")),
                    new Choice('or', $("Oromo")),
                ],
                next: function(choice) {
                    return go.utils
                        .save_language(self.im, self.contact, choice.value)
                        .then(function() {
                            return 'state_consent';
                        });
                }
            });
        });

        self.add('state_consent', function(name) {
            return new ChoiceState(name, {
                question: $("To give you the info & help you need, we will:\n" +
                    "- Store your cell #, language & country of origin\n" +
                    "- Sometimes send u SMSs\n" +
                    "Do you consent to this?"),
                choices: [
                    new Choice('give_consent', $("Yes")),
                    new Choice('deny_consent', $("No"))
                ],
                next: function(choice) {
                    self.contact.extra.consent = choice.value;
                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            if (choice.value === 'give_consent') {
                                return 'state_unregistered_menu';
                            } else {
                                return 'state_consent_required';
                            }
                        });
                }
            });
        });

        self.add('state_consent_required', function(name) {
            return new ChoiceState(name, {
                question: $("We're sorry, we can't help without you providing consent to us storing your info & sending you SMSs. What would you like to do?"),
                choices: [
                    new Choice('state_consent', $("Go back to consent")),
                    new Choice('state_report_end', $("Exit"))  // TODO Use unique end state
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_unregistered_menu', function(name) {
            return new ChoiceState(name, {
                question: $("Select an option:"),
                choices: [
                    new Choice('state_country', $("Find info about refugee/migrant rights in SA")),
                    new Choice('xenophobia', $("Report xenophobia")),
                    new Choice('arrest', $("Report unlawful arrest")),
                    new Choice('corruption', $("Report corruption")),
                    new Choice('other', $("Report something else")),
                ],
                next: function(choice) {
                    if (choice.value === 'state_country') {
                        return 'state_country';
                    } else {
                        self.contact.extra.report_theme = choice.value;
                        return self.im.contacts
                            .save(self.contact)
                            .then(function() {
                                return 'state_report_legal';
                            });
                    }
                }
            });
        });

        self.add('state_country', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('Select your country of origin:'),
                characters_per_page: 160,
                options_per_page: null,
                more: $('Next'),
                back: $('Back'),
                choices: [
                    new Choice('somalia', $('Somalia')),
                    new Choice('ethiopia', $('Ethiopia')),
                    new Choice('eritrea', $('Eritrea')),
                    new Choice('drc', $('Democratic Republic of Congo')),
                    new Choice('burundi', $('Burundi')),
                    new Choice('kenya', $('Kenya')),
                    new Choice('rwanda', $('Rwanda')),
                    new Choice('sudan', $('Sudan/South Sudan')),
                    new Choice('zimbabwe', $('Zimbabwe')),
                    new Choice('uganda', $('Uganda')),
                    new Choice('egypt', $('Egypt')),
                    new Choice('mozambique', $('Mozambique')),
                    new Choice('syria', $('Syria')),
                    new Choice('angola', $('Angola')),
                ],
                next: function(choice) {
                    self.contact.extra.country = choice.value;
                    return Q.all([
                        self.im.contacts.save(self.contact)
                    ])
                    .then(function() {
                        return 'state_ref_mig_1';
                    });
                }
            });
        });

        self.add('state_ref_mig_1', function(name) {
            return new ChoiceState(name, {
                question: $("Would you like to find out if you qualify for refugee status?"),
                choices: [
                    new Choice('state_ref_mig_2', $("Yes, I want to find out if I qualify")),
                    new Choice('state_migrant_main', $("No, I'd like to access information for migrants")),
                ],
                next: function(choice) {
                    if (choice.value === 'state_migrant_main') {
                        return go.utils
                            .register_user(self.contact, self.im, 'migrant')
                            .then(function() {
                                return choice.value;
                            });
                    } else {
                        return choice.value;
                    }
                }
            });
        });

        self.add('state_ref_mig_2', function(name) {
            return new ChoiceState(name, {
                question: $("Have you fled from your country in fear of your life due to your race, religion, nationality, gender, political or social group?"),
                choices: [
                    new Choice('state_register_refugee', $("Yes")),
                    new Choice('state_ref_mig_3', $("No")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_ref_mig_3', function(name) {
            return new ChoiceState(name, {
                question: $("Are you married to or depend upon a person who fled their country in fear of their life?"),
                choices: [
                    new Choice('state_register_refugee', $("Yes")),
                    new Choice('state_ref_mig_4', $("No")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_ref_mig_4', function(name) {
            return new ChoiceState(name, {
                question: $("Are you married to a recognised refugee?"),
                choices: [
                    new Choice('state_register_refugee', $("Yes")),
                    new Choice('state_ref_noqualify', $("No")),
                ],
                next: function(choice) {
                    if (choice.value === 'state_ref_noqualify') {
                        return go.utils
                            .register_user(self.contact, self.im, 'migrant')
                            .then(function() {
                                return choice.value;
                            });
                    } else {
                        return choice.value;
                    }
                }
            });
        });

        self.add('state_register_refugee', function(name) {
            return go.utils
                .register_user(self.contact, self.im, 'refugee')
                .then(function() {
                    return self.states.create('state_ref_qualify');
                });
        });

        self.add('state_ref_qualify', function(name) {
            return new ChoiceState(name, {
                question: $("It looks like you may qualify for refugee status! Your asylum application process will confirm this. Please start this application now."),
                choices: [
                    new Choice('state_refugee_main', $("Find out more")),
                    new Choice('state_registration_end', $("Exit")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_ref_noqualify', function(name) {
            return new ChoiceState(name, {
                question: $("You don't qualify for refugee status in SA. If you are a foreign national looking to work, study or run a business you'll need a visa."),
                choices: [
                    new Choice('state_migrant_main', $("Find out more")),
                    new Choice('state_registration_end', $("Exit")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_registration_end', function(name) {
            return new EndState(name, {
                text: $("Thank you for dialling into the refugee and migrants rights service. Please dial back in to find out more."),
                next: 'state_registered_landing'
            });
        });


    // REPORT STATES

        self.add('state_report_end_permission', function(name) {
            return new EndState(name, {
                text: $("Unfortunately you cannot submit a report without indicating you understand and agree to the terms & conditions. Please redial to try again."),
                next: 'state_start'
            });
        });

        self.add('state_report_legal', function(name) {
            var question_map = {
                xenophobia: $("Reports are used to see where attacks may be in an area & warn others. LHR treats reports as serious. All rights reserved."),
                arrest: $("LHR treats these reports as serious & will try to respond to critical reports as soon as possible. All rights reserved."),
                corruption: $("Your details are confidential & used only by LHR & partners for investigation timeously, where possible. All rights reserved."),
                other: $("LHR will process your info and try to respond timeously. Please don't abuse this system. All rights reserved.")
            };
            return new ChoiceState(name, {
                question: question_map[self.contact.extra.report_theme],
                choices: [
                    new Choice('state_report_category', $("I understand")),
                    new Choice('state_report_end_permission', $("Exit")),
                ],
                next: function(choice) {
                    // reset dialback sms reminder checking since it's a new report
                    self.contact.extra.dialback_reminder_report_sent = 'false';
                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            return choice.value;
                        });
                }
            });
        });

        self.add('state_report_category', function(name) {
            var question_map = {
                xenophobia: $("Which of these xenophobic acts is taking place?"),
                arrest: $("Why have you been arrested?"),
                corruption: $("Where have you experienced corruption?"),
                other: $("What would you like to report?")
            };
            var choices_map = {
                xenophobia: [
                    new Choice('physical_threat', $("Physical threat")),
                    new Choice('protests', $("Protests in your area")),
                    new Choice('looting', $("Looting in your area"))
                ],
                arrest: [
                    new Choice('no_asylum_permit', $("Not having an asylum permit")),
                    new Choice('no_migrant_visa', $("Not having a migrant visa")),
                    new Choice('unknown', $("You don't know")),
                    new Choice('other', $("Other"))
                ],
                corruption: [
                    new Choice('refugee_reception_office', $("Refugee Reception Office")),
                    new Choice('saps', $("South African Police Service")),
                    new Choice('department_of_home_affairs', $("Department of Home Affairs")),
                    new Choice('social_services', $("Social services")),
                    new Choice('other', $("Other"))
                ],
                other: [
                    new Choice('complaint', $("A complaint")),
                    new Choice('other', $("Other"))
                ],
            };
            return new ChoiceState(name, {
                question: question_map[self.contact.extra.report_theme],
                choices: choices_map[self.contact.extra.report_theme],
                next: function(choice) {
                    self.contact.extra.report_category = choice.value;
                    return self.im.contacts
                        .save(self.contact)
                        .then(function() {
                            return 'state_report_location';
                        });
                }
            });
        });

        self.states.add('state_report_location', function(name) {
            return new LocationState(name, {
                question:
                    $("Please type the name of the suburb in which the incident took place."),
                refine_question:
                    $("Please select your location:"),
                error_question:
                    $("Sorry, we're not sure which suburb you mean. Please re-enter your location again carefully and make sure you use the correct spelling."),
                next: 'state_report_submit_critical',
                next_text: $('More'),
                previous_text: $('Back'),
                retry_text: $('Retry'),
                skip_text: $('Skip'),


                map_provider: new OpenStreetMap({
                    api_key: self.im.config.open_street_map.api_key,
                    bounding_box: ["16.4500", "-22.1278", "32.8917", "-34.8333"],
                    address_limit: 4,

                    extract_address_data: function(result) {
                        var formatted_address;
                        var addr_from_details = [];
                        if (!result.address) {
                            formatted_address = result.display_name;
                        } else {
                            result.address.city = result.address.city ||
                                result.address.town || result.address.village;

                            var addr_details = ['suburb', 'city', 'state'];

                            addr_details.forEach(function(detail) {
                                if (result.address[detail] !== undefined) {
                                    addr_from_details.push(result.address[detail]);
                                } else {
                                    addr_from_details.push('n/a');
                                }
                            });

                            formatted_address = addr_from_details.join(', ');
                        }
                        return {
                            formatted_address: formatted_address,
                            lat: result.lat,
                            lon: result.lon,
                            suburb: addr_from_details[0],
                            city: addr_from_details[1],
                            province: addr_from_details[2]
                        };
                    },

                    extract_address_label: function(result) {
                        if (!result.address) {
                            return result.display_name;
                        } else {
                            result.address.city = result.address.city ||
                                result.address.town || result.address.village;

                            var addr_details = ['suburb', 'city', 'state'];
                            var addr_from_details = [];

                            addr_details.forEach(function(detail) {
                                if (result.address[detail] !== undefined) {
                                    if (detail === 'state') {
                                        result.address[detail] = go.utils
                                                        .shorten_province(result.address[detail]);
                                    }
                                    addr_from_details.push(result.address[detail]);
                                }
                            });

                            return addr_from_details.join(', ');
                        }
                    }
                })
            });
        });

        self.add('state_report_submit_critical', function(name) {
            // Reload contact
            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                    self.contact = user_contact;
                })
                .then(function() {
                    // Post basic info report to nightingale
                    return go.utils
                        .nightingale_post(self.im, self.contact)
                        .then(function(response) {
                            return go.utils
                                .save_report_id_to_contact(self.im, self.contact, response.data.id)
                                .then(function() {
                                    return self.states.create('state_report_details');
                                });
                        });
                });
        });

        self.add('state_report_details', function(name) {
            var question_map = {
                xenophobia: $("Please type an explanation of what's happening. Are you in danger? Is someone else? Be specific - it'll enable us to send the right response & help you faster."),
                arrest: $("Please type the full name of the person who was arrested. Also, what happened to cause the arrest? And what documentation/permit does this person have, if any?"),
                corruption: $("Please type a detailed explanation of the incident: what happened; where it happened; the offending official's name; his/her physical features; date/time"),
                other: $("Please explain the incident in as much detail as you can: What happened; where it happened; the offender's name; his/her physical features; date/time.")
            };
            return new FreeText(name, {
                question: question_map[self.contact.extra.report_theme],
                next: function(choice) {
                    return 'state_report_submit_detail';
                }
            });
        });

        self.add('state_report_submit_detail', function(name) {
            // Patch nightingale report with extra information
            return go.utils
                .nightingale_patch(self.im, self.contact)
                .then(function() {
                    return self.states.create('state_report_complete');
                });
        });

        self.add('state_report_complete', function(name) {
            return new ChoiceState(name, {
                question: $("Thank you very much. Your report has been submitted."),
                choices: [
                    new Choice('state_start', $("Main menu")),
                    new Choice('state_report_end', $("Exit")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_report_end', function(name) {
            return new EndState(name, {
                text: $("Goodbye!"),
                next: 'state_start'
            });
        });


    // MAIN MENU STATES

        self.add('state_refugee_main', function(name) {
            return new ChoiceState(name, {
                question: $("Select an option:"),
                choices: [
                    new Choice("state_registered_landing", $("Report")),
                    new Choice("refugee_step1", $("Step 1: Applying for asylum")),
                    new Choice("refugee_step2", $("Step 2: Life in SA")),
                    new Choice("refugee_tips", $("Tips")),
                    new Choice("refugee_about", $("About/T&Cs")),
                    new Choice("state_services", $("Services Near Me")),
                    new Choice("state_change_settings", $("Change Settings")),
                ],
                next: function(choice) {
                    return go.utils
                        .fire_main_menu_metrics(self.im, 'refugee_main', choice.value)
                        .then(function() {
                            if (choice.value.substr(0,5) === "state") {
                                return choice.value;
                            } else {
                                self.contact.extra.faq_id = self.im.config.snappy.faq_id[choice.value];
                                return self.im.contacts
                                    .save(self.contact)
                                    .then(function() {
                                        return 'state_faq_topics';
                                    });
                            }
                        });
                }
            });
        });

        self.add('state_migrant_main', function(name) {
            return new ChoiceState(name, {
                question: $("Select an option:"),
                choices: [
                    new Choice("state_registered_landing", $("Report")),
                    new Choice("migrant_step1", $("Step 1: Visa application")),
                    new Choice("migrant_step2", $("Step 2: Life in SA")),
                    new Choice("migrant_about", $("About/T&Cs")),
                    new Choice("state_services", $("Services Near Me")),
                    new Choice("state_change_settings", $("Change Settings")),
                ],
                next: function(choice) {
                    return go.utils
                        .fire_main_menu_metrics(self.im, 'migrant_main', choice.value)
                        .then(function() {
                            if (choice.value.substr(0,5) === "state") {
                                return choice.value;
                            } else {
                                self.contact.extra.faq_id = self.im.config.snappy.faq_id[choice.value];
                                return self.im.contacts
                                    .save(self.contact)
                                    .then(function() {
                                        return 'state_faq_topics';
                                    });
                            }
                        });
                }
            });
        });


    // LOCATION FINDING STATES

        self.states.add('state_services', function(name) {
            return new LocationState(name, {
                question:
                    $("To find services near you we need to know what suburb or area you are in. Please type this in below & be specific. e.g. Inanda Sandton"),
                refine_question:
                    $("Please select your location:"),
                error_question:
                    $("Sorry there are no results for your location. Please re-enter your location again carefully and make sure you use the correct spelling."),
                next: 'state_locate_service',
                next_text: $('More'),
                previous_text: $('Back'),
                retry_text: $('Retry'),
                skip_text: $('Skip'),

                map_provider: new OpenStreetMap({
                    api_key: self.im.config.open_street_map.api_key,
                    bounding_box: ["16.4500", "-22.1278", "32.8917", "-34.8333"],
                    address_limit: 4,

                    extract_address_data: function(result) {
                        var formatted_address;
                        var addr_from_details = [];
                        if (!result.address) {
                            formatted_address = result.display_name;
                        } else {
                            result.address.city = result.address.city ||
                                result.address.town || result.address.village;

                            var addr_details = ['suburb', 'city', 'state'];

                            addr_details.forEach(function(detail) {
                                if (result.address[detail] !== undefined) {
                                    addr_from_details.push(result.address[detail]);
                                } else {
                                    addr_from_details.push('n/a');
                                }
                            });

                            formatted_address = addr_from_details.join(', ');
                        }
                        return {
                            formatted_address: formatted_address,
                            lat: result.lat,
                            lon: result.lon,
                            suburb: addr_from_details[0],
                            city: addr_from_details[1],
                            province: addr_from_details[2]
                        };
                    },

                    extract_address_label: function(result) {
                        if (!result.address) {
                            return result.display_name;
                        } else {
                            result.address.city = result.address.city ||
                                result.address.town || result.address.village;

                            var addr_details = ['suburb', 'city', 'state'];
                            var addr_from_details = [];

                            addr_details.forEach(function(detail) {
                                if (result.address[detail] !== undefined) {
                                    if (detail === 'state') {
                                        result.address[detail] = go.utils
                                                        .shorten_province(result.address[detail]);
                                    }
                                    addr_from_details.push(result.address[detail]);
                                }
                            });

                            return addr_from_details.join(', ');
                        }
                    }
                })
            });
        });

        // state_locate_service
        self.states.add('state_locate_service', function(name) {
            // reload the contact
            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                    self.contact = user_contact;
                })
                .then(function() {
                    // send the post request
                    return go.utils
                        .locate_poi(self.im, self.contact)
                        .then(function() {
                            return self.states.create(
                                'state_locate_stall_initial');
                        });
                });
        });

        // state_locate_stall_initial
        self.add('state_locate_stall_initial', function(name) {
            var opts = { retries: 0 };
            return new ChoiceState(name, {
                question: $("The system is looking up services near you. This usually takes less than a minute."),
                choices: [
                    new Choice('state_locate_get_results', $("View services"))
                ],
                next: function(choice) {
                    return {
                        name: choice.value,
                        creator_opts: opts
                    };
                }
            });
        });

        // state_locate_no_results
        self.add('state_locate_no_results', function(name) {
            var opts = { retries: 1 };
            return new ChoiceState(name, {
                question: $("Unfortunately we couldn't find any locations close to you. Try one more time or exit?"),
                choices: [
                    new Choice('state_locate_get_results', $("Try again")),
                    new Choice('state_locate_exit', $("Exit"))
                ],
                next: function(choice) {
                    return {
                        name: choice.value,
                        creator_opts: opts
                    };
                }
            });
        });

        // state_locate_exit
        self.add('state_locate_exit', function(name) {
            return new EndState(name, {
                text: $("Sorry, no nearby services available. You can still use the Useful Contacts Main Menu option to search for services that are further off."),
                next: 'state_main_menu'
            });
        });


        // state_locate_get_results
        self.add('state_locate_get_results', function(name, opts) {
            return go.utils.get_poi_results(self.im, self.contact)
            .then(function(poi_results) {
                if (poi_results.length > 0) {
                    // results have been found
                    var creator_opts = { poi_results: poi_results };
                    return self.states.create('state_locate_show_results', creator_opts);
                } else if (opts.retries === 0) {
                    // stall again if results are not available and no previous retries
                    return self.states.create('state_locate_no_results');
                } else {
                    // exit if they've retried before
                    return self.states.create('state_locate_exit');
                }
            });
        });

        // state_locate_show_results
        self.add('state_locate_show_results', function(name, opts) {
            var poi_results = opts.poi_results;
            var choices = go.utils.extract_choices_from_results(poi_results);

            return new ChoiceState(name, {
                question: $('Select a service for more info'),
                choices: choices,
                next: function(choice) {
                    var opts = {
                        poi_results: poi_results,
                        poi_details: poi_results[choice.value][1]
                    };
                    return self.states.create('state_locate_details', opts);
                }
            });
        });

        // state_locate_details
        self.add('state_locate_details', function(name, opts) {
            var poi_results = opts.poi_results;
            return new PaginatedState(name, {
                // TODO test for possible translation problems here
                text: opts.poi_details,
                characters_per_page: 160,
                exit: $('Exit'),
                back: $('Back'),
                more: $('More'),
                next: function() {
                    var opts = { poi_results: poi_results };
                    return self.states.create('state_locate_show_results', opts);
                }
            });
        });


    // SNAPPY FAQ BROWSER STATES

        self.add('state_faq_topics', function (name) {
            return go.utils
                .get_snappy_topics_lang(self.im, self.contact.extra.faq_id, self.contact.extra.lang)
                .then(function(topics) {

                    var choices = _.sortBy(topics, function (d) {
                            return parseInt(d.order, 10);
                        })
                        .map(function(d) {
                            return new Choice(d.id, d.topic);
                        });
                    choices.push(new Choice('back', $('Main menu')));

                    return new PaginatedChoiceState(name, {
                        question: $("Select an option:"),
                        choices: choices,
                        options_per_page: null,
                        next: function(choice) {
                            var topic_id = choice.value.toString();
                            if (topic_id === 'back') {
                                return 'state_main';
                            } else {
                                self.contact.extra.topic_id = topic_id;
                                return Q
                                    .all([
                                        self.im.metrics.fire.inc(['faq_view_topic', topic_id].join('.'), 1),
                                        self.im.contacts.save(self.contact)
                                    ])
                                    .then(function() {
                                        return 'state_faq_questions';
                                    });

                            }
                        }
                    });
                });
        });

        self.add('state_faq_questions', function(name) {
            return go.utils
                .get_snappy_questions_lang(self.im, self.contact.extra.faq_id,
                    self.contact.extra.topic_id, self.contact.extra.lang)
                .then(function(questions) {
                    var choices = _.sortBy(questions, function (d) {
                            return parseInt(d.pivot.order, 10);
                        })
                        .map(function(d) {
                            return new Choice(d.id, d.question);
                        });
                    choices.push(new Choice('back', $('Previous menu')));

                    return new PaginatedChoiceState(name, {
                        question: $("Select an option:"),
                        choices: choices,
                        options_per_page: null,
                        next: function(choice) {
                            var question_id = choice.value.toString();
                            if (question_id === 'back') {
                                return 'state_faq_topics';
                            } else {
                                var index = _.findIndex(questions, { 'id': parseInt(question_id, 10) });
                                self.contact.extra.faq_answer = questions[index].answer.trim();
                                self.contact.extra.question_id = question_id;
                                return Q
                                    .all([
                                        self.im.metrics.fire.inc(['faq_view_question'].join('.'), 1),
                                        self.im.contacts.save(self.contact)
                                    ])
                                    .then(function() {
                                        return 'state_faq_answer';
                                    });
                            }
                        }
                    });
                });
        });

        self.add('state_faq_answer', function(name) {
            return new PaginatedState(name, {
                text: self.contact.extra.faq_answer,
                more: $('Next'),
                back: $('Back'),
                exit: $('Send to me by SMS'),
                next: function() {
                    return 'state_send_faq_sms';
                }
            });
        });

        self.add('state_send_faq_sms', function(name) {
            return self.im
                .outbound.send_to_user({
                    endpoint: 'sms',
                    content: self.contact.extra.faq_answer
                })
                .then(function() {
                    return self.im.metrics.fire.inc(['faq_sent_via_sms'].join('.'), 1);
                })
                .then(function () {
                    return self.states.create('state_faq_end');
                });
        });

        self.add('state_faq_end', function(name) {
            return new EndState(name, {
                text: $("Your SMS will be sent to you shortly. Don't forget to dial back in to {{ ussd_num }} to find all the info you need about applying for asylum and living in SA."
                    ).context({
                        ussd_num: self.im.config.channel
                    }),
                next: 'state_start'
            });
        });


    // CHANGE SETTINGS STATES

        self.add('state_change_settings', function(name) {
            return new ChoiceState(name, {
                question: $('Select setting to change:'),
                choices: [
                    new Choice('state_change_language', $("Language")),
                    new Choice('state_change_country', $("Country")),
                    new Choice('state_change_status', $("Status (refugee / migrant)")),
                    new Choice('state_change_confirmation', $("Back to Main Menu"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.add('state_change_language', function(name) {
            return new ChoiceState(name, {
                question: $('Please choose your language:'),
                choices: [
                    new Choice('en', $("English")),
                    new Choice('fr', $("French")),
                    new Choice('sw', $("Swahili")),
                    new Choice('so', $("Somali")),
                    new Choice('or', $("Oromo")),
                ],
                next: function(choice) {
                    return go.utils
                        .update_language(self.im, self.contact, choice.value)
                        .then(function() {
                            return 'state_change_settings';
                        });
                }
            });
        });

        self.add('state_change_country', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('Select your country of origin:'),
                characters_per_page: 160,
                options_per_page: null,
                more: $('Next'),
                back: $('Back'),
                choices: [
                    new Choice('somalia', $('Somalia')),
                    new Choice('ethiopia', $('Ethiopia')),
                    new Choice('eritrea', $('Eritrea')),
                    new Choice('drc', $('Democratic Republic of Congo')),
                    new Choice('burundi', $('Burundi')),
                    new Choice('kenya', $('Kenya')),
                    new Choice('rwanda', $('Rwanda')),
                    new Choice('sudan', $('Sudan/South Sudan')),
                    new Choice('zimbabwe', $('Zimbabwe')),
                    new Choice('uganda', $('Uganda')),
                    new Choice('egypt', $('Egypt')),
                    new Choice('mozambique', $('Mozambique')),
                    new Choice('syria', $('Syria')),
                    new Choice('angola', $('Angola')),
                ],
                next: function(choice) {
                    return go.utils
                        .update_country(self.im, self.contact, choice.value)
                        .then(function() {
                            return 'state_change_settings';
                        });
                }
            });
        });

        self.add('state_change_status', function(name) {
            return new ChoiceState(name, {
                question: $('Are you a refugee or migrant?'),
                choices: [
                    new Choice('refugee', $('I am a refugee')),
                    new Choice('migrant', $('I am a migrant'))
                ],
                next: function(choice) {
                    if (choice.value === self.contact.extra.status) {
                        return 'state_change_settings';
                    } else {
                        return 'state_change_status_confirm';
                    }
                }
            });
        });

        self.add('state_change_status_confirm', function(name) {
            return new ChoiceState(name, {
                question: $("When you registered, you were identified as a {{status}}. Are you sure you would like to change your status?"
                    ).context({
                        status: self.contact.extra.status
                    }),
                choices: [
                    new Choice('confirm', $("Yes")),
                    new Choice('abort', $("No"))
                ],
                next: function(choice) {
                    if (choice.value === 'abort') {
                        return 'state_change_settings';
                    } else {
                        var new_status = (self.contact.extra.status === 'refugee')
                            ? 'migrant' : 'refugee';
                        return go.utils
                            .update_status(self.im, self.contact, new_status)
                            .then(function() {
                                return 'state_change_settings';
                            });
                    }
                }
            });
        });



        self.add('state_change_confirmation', function(name) {
            return new ChoiceState(name, {
                question: $("Your new settings have been saved. Brought to you by Lawyers for Humans Rights www.lhr.org.za"),
                choices: [
                    new Choice('state_main', $("Continue"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

    });

    return {
        GoRR: GoRR
    };
}();
