// WARNING: This is a generated file.
//          If you edit it you will be sad.
//          Edit src/app.js instead.

var go = {};
go;

var Q = require('q');
var moment = require('moment');
var vumigo = require('vumigo_v02');
var JsonApi = vumigo.http.api.JsonApi;
var Choice = vumigo.states.Choice;

// Shared utils lib
go.utils = {

    timed_out: function(im) {
        var no_redirects = [
            'state_language',
            'state_registered_landing',
            'state_registration_end',
            'state_report_end'
        ];
        return im.msg.session_event === 'new'
            && im.user.state.name
            && no_redirects.indexOf(im.user.state.name) === -1;
    },

    eval_dialback_reminder: function(e, im, contact, $) {
        return go.utils.should_send_dialback_reminder(e, contact)
            ? go.utils.send_dialback_reminder(im, contact, $)
            : Q();
    },

    should_send_dialback_reminder: function(e, contact) {
        var dialback_states = [
            'state_country',
            'state_ref_mig_1',
            'state_ref_mig_2',
            'state_ref_mig_3',
            'state_ref_mig_4'
        ];
        return e.user_terminated
            && (contact.extra.dialback_reminder_sent !== 'true')
            && dialback_states.indexOf(e.im.state.name) !== -1;
    },

    send_dialback_reminder: function(im, contact, $) {
        return im.outbound
            .send_to_user({
                endpoint: 'sms',
                content: go.utils.get_dialback_reminder_sms(im, $)
            })
            .then(function() {
                contact.extra.dialback_reminder_sent = 'true';
                return im.contacts.save(contact);
            });
    },

    get_dialback_reminder_sms: function(im, $) {
        return $("Please dial back in to {{ USSD_number }} to complete the registration.")
            .context({
                USSD_number: im.config.channel
            });
    },

    save_language: function(im, contact, lang) {
        var lang_map = {
            en: 'english',
            fr: 'french',
            am: 'amharic',
            sw: 'swahili',
            so: 'somali'
        };
        contact.extra.lang = lang;
        contact.extra.language = lang_map[lang];

        return Q.all([
            im.user.set_lang(lang),
            im.contacts.save(contact)
        ]);
    },

    set_language: function(im, contact) {
        if (contact.extra.lang !== undefined) {
            return im.user.set_lang(contact.extra.lang);
        } else {
            return Q();
        }
    },

    update_language: function(im, contact, lang) {
        return go.utils
            .save_language(im, contact, lang)
            .then(function() {
                return Q.all([
                    go.utils.subscription_update_language(im, contact),
                    im.metrics.fire.inc(['total', 'change_language', 'last'].join('.')),
                    im.metrics.fire.sum(['total', 'change_language', 'sum'].join('.'), 1)
                ]);
            });
    },

    update_country: function(im, contact, country) {
        contact.extra.country = country;
        return Q.all([
            im.contacts.save(contact),
            im.metrics.fire.inc(['total', 'change_country', 'last'].join('.')),
            im.metrics.fire.sum(['total', 'change_country', 'sum'].join('.'), 1)
        ]);
    },

    update_status: function(im, contact, status) {
        contact.extra.status = status;
        return Q.all([
            im.contacts.save(contact),
            im.metrics.fire.inc(['total', 'change_status', 'last'].join('.')),
            im.metrics.fire.sum(['total', 'change_status', 'sum'].join('.'), 1)
        ]);
    },

    register_user: function(contact, im, status) {
        contact.extra.status = status;
        var country = contact.extra.country;

        return Q.all([
            im.contacts.save(contact),
            go.utils.subscription_subscribe(contact, im),
            im.metrics.fire.inc(['total', 'registrations', 'last'].join('.')),
            im.metrics.fire.sum(['total', 'registrations', 'sum'].join('.'), 1),
            im.metrics.fire.inc(['total', 'registrations', status, 'last'].join('.')),
            im.metrics.fire.sum(['total', 'registrations', status, 'sum'].join('.'), 1),
            im.metrics.fire.inc(['total', 'registrations', country, 'last'].join('.')),
            im.metrics.fire.sum(['total', 'registrations', country, 'sum'].join('.'), 1),
            im.metrics.fire.inc(['total', 'registrations', status, country, 'last'].join('.')),
            im.metrics.fire.sum(['total', 'registrations', status, country, 'sum'].join('.'), 1)
        ]);
    },

    track_redials: function(contact, im, decision) {
        var status = contact.extra.status || 'unregistered';
        return Q.all([
            im.metrics.fire.inc(['total', 'redials', 'choice_made', 'last'].join('.')),
            im.metrics.fire.sum(['total', 'redials', 'choice_made', 'sum'].join('.'), 1),
            im.metrics.fire.inc(['total', 'redials', status, 'last'].join('.')),
            im.metrics.fire.sum(['total', 'redials', status, 'sum'].join('.'), 1),
            im.metrics.fire.inc(['total', 'redials', decision, 'last'].join('.')),
            im.metrics.fire.sum(['total', 'redials', decision, 'sum'].join('.'), 1),
            im.metrics.fire.inc(['total', 'redials', status, decision, 'last'].join('.')),
            im.metrics.fire.sum(['total', 'redials', status, decision, 'sum'].join('.'), 1),
        ]);
    },

    get_clean_first_word: function(user_message) {
        return user_message
            .split(" ")[0]          // split off first word
            .replace(/\W/g, '')     // remove non letters
            .toUpperCase();         // capitalise
    },

    control_api_call: function (method, params, payload, endpoint, im) {
        var http = new JsonApi(im, {
            headers: {
                'Authorization': ['Token ' + im.config.control.api_key]
            }
        });
        switch (method) {
            case "post":
                return http.post(im.config.control.url + endpoint, {
                    data: payload
                });
            case "get":
                return http.get(im.config.control.url + endpoint, {
                    params: params
                });
            case "patch":
                return http.patch(im.config.control.url + endpoint, {
                    data: payload
                });
            case "put":
                return http.put(im.config.control.url + endpoint, {
                    params: params,
                  data: payload
                });
            case "delete":
                return http.delete(im.config.control.url + endpoint);
            }
    },

    subscription_subscribe: function(contact, im) {
        var payload = {
            contact_key: contact.key,
            to_addr: contact.msisdn,
            lang: contact.extra.lang,
            messageset_id: 1,
            schedule: 1
        };

        return go.utils
            .control_api_call("post", null, payload, 'subscription/', im)
            .then(function(result) {
                if (result.code >= 200 && result.code < 300){
                    return Q.all([
                        im.metrics.fire.inc(["total", "subscription_subscribe_success", "last"].join('.')),
                        im.metrics.fire.sum(["total", "subscription_subscribe_success", "sum"].join('.'), 1)
                    ]);
                } else {
                    return Q.all([
                        im.metrics.fire.inc(["total", "subscription_subscribe_fail", "last"].join('.')),
                        im.metrics.fire.inc(["total", "subscription_subscribe_fail", "sum"].join('.'), 1)
                    ]);
                }
        });
    },

    subscription_update_language: function(im, contact) {
        var params = {
            to_addr: contact.msisdn
        };
        return go.utils
        .control_api_call("get", params, null, 'subscription/', im)
        .then(function(json_result) {
            // change all subscription languages
            var update = json_result.data;
            var clean = true;  // clean tracks if api call is unnecessary
            for (i=0; i<update.objects.length; i++) {
                if (update.objects[i].lang !== contact.extra.lang) {
                    update.objects[i].lang = contact.extra.lang;
                    clean = false;
                }
            }
            if (!clean) {
                return go.utils
                .control_api_call("patch", {}, update, 'subscription/', im)
                .then(function(result) {
                    if (result.code >= 200 && result.code < 300) {
                        return Q.all([
                            im.metrics.fire.inc(["total", "subscription_lang_update_success", "last"].join('.')),
                            im.metrics.fire.sum(["total", "subscription_lang_update_success", "sum"].join('.'), 1)
                        ]);
                    } else {
                        return Q.all([
                            im.metrics.fire.inc(["total", "subscription_lang_update_fail", "last"].join('.')),
                            im.metrics.fire.sum(["total", "subscription_lang_update_fail", "sum"].join('.'), 1)
                        ]);
                    }
                });
            } else {
                return Q();
            }
        });
    },


    subscription_unsubscribe_all: function(contact, im) {
        var params = {
            to_addr: contact.msisdn
        };
        return go.utils
        .control_api_call("get", params, null, 'subscription/', im)
        .then(function(json_result) {
            // make all subscriptions inactive
            var update = json_result.data;
            var clean = true;  // clean tracks if api call is unnecessary
            for (i=0; i<update.objects.length; i++) {
                if (update.objects[i].active === true) {
                    update.objects[i].active = false;
                    clean = false;
                }
            }
            if (!clean) {
                return go.utils
                .control_api_call("patch", {}, update, 'subscription/', im)
                .then(function(result) {
                    if (result.code >= 200 && result.code < 300) {
                        return Q.all([
                            im.metrics.fire.inc(["total", "subscription_unsubscribe_success", "last"].join('.')),
                            im.metrics.fire.sum(["total", "subscription_unsubscribe_success", "sum"].join('.'), 1)
                        ]);
                    } else {
                        return Q.all([
                            im.metrics.fire.inc(["total", "subscription_unsubscribe_fail", "last"].join('.')),
                            im.metrics.fire.sum(["total", "subscription_unsubscribe_fail", "sum"].join('.'), 1)
                        ]);
                    }
                });
            } else {
                return Q();
            }
        });
    },

    opt_out: function(im, contact) {
        contact.extra.optout_last_attempt = go.utils.get_today(im.config);

        return Q.all([
            im.contacts.save(contact),
            go.utils.subscription_unsubscribe_all(contact, im),
            im.api_request('optout.optout', {
                address_type: "msisdn",
                address_value: contact.msisdn,
                message_id: im.msg.message_id
            })
        ]);
    },

    opt_in: function(im, contact) {
        contact.extra.optin_last_attempt = go.utils.get_today(im.config);
        return Q.all([
            im.contacts.save(contact),
            im.api_request('optout.cancel_optout', {
                address_type: "msisdn",
                address_value: contact.msisdn
            }),
        ]);
    },

    get_today: function(config) {
        var today;
        if (config.testing_today) {
            today = new moment(config.testing_today);
        } else {
            today = new moment();
        }
        return today.format('YYYY-MM-DD hh:mm:ss.SSS');
    },

    date_difference: function(date1, date2) {
        // returns the difference between the dates in days - true adds decimals
        return moment(date1).diff(moment(date2), 'days', true);
    },

    fire_returning_user_metrics: function(im, contact) {
        var today = go.utils.get_today(im.config);
        contact.extra.last_seen = today;
        var user_registered = contact.extra.status === 'refugee' || contact.extra.status === 'migrant';
        var no_last_returning_metric = contact.extra.last_returning_metric_fire === undefined;
        var old_last_returning_metric = go.utils.date_difference(today, contact.extra.last_returning_metric_fire) > 7;

        // For tracking weekly returning users. Only tracking returning registered users.  If the
        // user has never returned before or the user was last tracked more than a week ago, it
        // should fire a new metric and save the fact to the contact
        if (user_registered && (no_last_returning_metric || old_last_returning_metric)) {
            contact.extra.last_returning_metric_fire = today;
            return Q.all([
                im.metrics.fire.inc(["total", "returning_users", "last"].join('.')),
                im.metrics.fire.sum(["total", "returning_users", "sum"].join('.'), 1),
                im.contacts.save(contact)
            ]);
        } else {
            return im.contacts.save(contact);
        }
    },

    fire_main_menu_metrics: function(im, from_state, to_state) {
        return Q.all([
            im.metrics.fire.inc(["total", from_state, to_state, "last"].join('.')),
            im.metrics.fire.sum(["total", from_state, to_state, "sum"].join('.'), 1)
        ]);
    },

    locate_poi: function(im, contact) {
        var req_lookup_url = im.config.location_api_url + 'requestlookup/';
        var http = new JsonApi(im, {
            headers: {
                'Authorization': ['Token ' + im.config.control.api_key]
            }
        });
        return http.post(req_lookup_url, {
            data: go.utils.make_lookup_data(im, contact, go.utils.make_user_location_data(contact))
        })
        .then(function(response) {
            contact.extra.poi_url = response.data.url;
            return Q.all([
                im.contacts.save(contact),
                im.metrics.fire.inc(["total", "location_queries", "last"].join('.')),
                im.metrics.fire.inc(["total", "location_queries", "sum"].join('.'), 1)
            ]);
        });
    },

    make_user_location_data: function(contact) {
        var location_data = {
            point: {
                type: "Point",
                coordinates: [
                    parseFloat(contact.extra['location:lon']),
                    parseFloat(contact.extra['location:lat'])
                ]
            }
        };
        return location_data;
    },

    make_lookup_data: function(im, contact, user_location) {
        var lookup_data = {
            search: go.utils.make_poi_search_params(im),
            response: {
                type: "USSD",
                to_addr: contact.msisdn,
                template: im.config.template,  // used for SMS only
                results: "",
                results_detailed: '[]'
            },
            location: user_location
        };
        return lookup_data;
    },

    make_poi_search_params: function(im) {
        var poi_type_wanted = "all";  // hardcoded as no more info currently available
        var search_data = {};

        if (poi_type_wanted === "all") {
            im.config.poi_types.forEach(function(poi_type) {
                search_data[poi_type] = "true";
            });
        } else {
            search_data[poi_type_wanted] = "true";
        }
        return search_data;
    },

    get_poi_results: function(im, contact) {
        var http = new JsonApi(im, {
            headers: {
                'Authorization': ['Token ' + im.config.control.api_key]
            }
        });
        return http
            .get(contact.extra.poi_url)
            .then(function(response) {
                return JSON.parse(response.data.response.results_detailed);
            });
    },

    location_contains_details: function(poi_result_text) {
        return poi_result_text.indexOf('(') !== -1;
    },

    extract_poi_name: function(poi_result_text) {
        return go.utils.location_contains_details(poi_result_text)
                ? poi_result_text.slice(0, poi_result_text.indexOf('(')).trim()
                : poi_result_text;
    },

    extract_choices_from_results: function(poi_results) {
        var choices = [];
        var index = 0;
        poi_results.forEach(function(poi_result) {
            var poi_name = go.utils.extract_poi_name(poi_result[1]);
            choices.push(new Choice(index.toString(), poi_name));
            index++;
        });
        return choices;
    },

    shorten_province: function(province) {
        var province_shortening = {
            'Gauteng': 'GP',
            'Mpumalanga': 'MP',
            'Limpopo': 'LP',
            'North West': 'NW',
            'Eastern Cape': 'EC',
            'Western Cape': 'WC',
            'Northern Cape': 'NC',
            'KwaZulu-Natal': 'KZN',
            'Free State': 'FS'
        };
        return province_shortening[province];
    },

    get_snappy_topics: function (im, faq_id) {
        var http = new JsonApi(im, {
          auth: {
            username: im.config.snappy.username,
            password: 'x'
          }
        });
        return http.get(im.config.snappy.endpoint + 'account/'+im.config.snappy.account_id+'/faqs/'+faq_id+'/topics', {
          data: JSON.stringify(),
          headers: {
            'Content-Type': ['application/json']
          },
          ssl_method: "SSLv3"
        });
    },

    get_snappy_questions: function(im, faq_id, topic_id) {
        var http = new JsonApi(im, {
            auth: {
                username: im.config.snappy.username,
                password: 'x'
            }
        });
        var snappy_questions_url = im.config.snappy.endpoint + 'account/' +
                im.config.snappy.account_id + '/faqs/' + faq_id + '/topics/' +
                topic_id + '/questions';

        return http.get(snappy_questions_url, {
            data: JSON.stringify(),
            headers: {
                'Content-Type': ['application/json']
            },
            ssl_method: "SSLv3"
        });
    },

    "commas": "commas"
};

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
                                return creator_opts.name;
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
                    new Choice('am', $("Amharic")),
                    new Choice('sw', $("Swahili")),
                    new Choice('so', $("Somali")),
                ],
                next: function(choice) {
                    return go.utils
                        .save_language(self.im, self.contact, choice.value)
                        .then(function() {
                            return 'state_unregistered_menu';
                        });
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
                    return choice.value;
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
                    return 'state_report_location';
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
                next_text: 'More',
                previous_text: 'Back',

                map_provider: new OpenStreetMap({
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
            // Post basic info report to nightingale
            return self.states.create('state_report_details');
        });

        self.add('state_report_details', function(name) {
            var question_map = {
                xenophobia: $("Please type an explanation of what's happening. Are you in danger? Is someone else? Be specific – it'll enable us to send the right response & help you faster."),
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
            return self.states.create('state_report_complete');
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
                    new Choice("state_migrant_step1_apply_visa", $("Step 1: Visa application")),
                    new Choice("state_migrant_step2_life_sa", $("Step 2: Life in SA")),
                    new Choice("state_migrant_about", $("About/T&Cs")),
                    new Choice("state_services", $("Services Near Me")),
                    new Choice("state_change_settings", $("Change Settings")),
                ],
                next: function(choice) {
                    return go.utils
                        .fire_main_menu_metrics(self.im, 'migrant_main', choice.value)
                        .then(function() {
                            return choice.value;
                        });
                }
            });
        });


    // LOCATION FINDING STATES

        // state_locate_me
        self.states.add('state_locate_me', function(name) {
            return new LocationState(name, {
                question:
                    $("To find your closest SService we need to know " +
                      "what suburb or area u are in. Please be " +
                      "specific. e.g. Inanda Sandton"),
                refine_question:
                    $("Please select your location:"),
                error_question:
                    $("Sorry there are no results for your location. " +
                      "Please re-enter your location again carefully " +
                      "and make sure you use the correct spelling."),
                next: 'state_locate_SService',
                next_text: 'More',
                previous_text: 'Back',

                map_provider: new OpenStreetMap({
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

        // state_locate_SService
        self.states.add('state_locate_SService', function(name) {
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
                text: $(opts.poi_details),
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
                .get_snappy_topics(self.im, self.contact.extra.faq_id)
                .then(function(response) {
                    if (typeof response.data.error  !== 'undefined') {
                        // TODO Throw proper error
                        return error;
                    } else {
                        var choices = _.sortBy(response.data, function (d) {
                                return parseInt(d.order, 10);
                            })
                            .map(function(d) {
                                return new Choice(d.id, d.topic);
                            });
                        choices.push(new Choice('back', $('Back')));

                        return new PaginatedChoiceState(name, {
                            question: $("Select an option:"),
                            choices: choices,
                            options_per_page: null,
                            next: function(choice) {
                                var topic_id = choice.value;
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
                    }
                });
        });

        self.add('state_faq_questions', function(name) {
            return go.utils
                .get_snappy_questions(self.im, self.contact.extra.faq_id, self.contact.extra.topic_id)
                .then(function(response) {
                    if (typeof response.data.error  !== 'undefined') {
                        // TODO Throw proper error
                        return error;
                    } else {
                        var choices = _.sortBy(response.data, function (d) {
                                return parseInt(d.pivot.order, 10);
                            })
                            .map(function(d) {
                                return new Choice(d.id, d.question);
                            });
                        choices.push(new Choice('back', $('Back')));

                        return new PaginatedChoiceState(name, {
                            question: $("Select an option:"),
                            choices: choices,
                            options_per_page: null,
                            next: function(choice) {
                                var question_id = choice.value;
                                if (question_id === 'back') {
                                    return 'state_faq_topics';
                                } else {
                                    var index = _.findIndex(response.data, { 'id': question_id });
                                    self.contact.extra.faq_answer = response.data[index].answer.trim();
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
                    }
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


    // REFUGEE MENU STATES

        self.add("state_020", function(name) {
            return new ChoiceState(name, {
                question: $("Select an option:"),
                choices: [
                    new Choice("state_201", $("Difference between a refugee & asylum seeker")),
                    new Choice("state_202", $("Who is excluded from refugee status?")),
                    new Choice("state_203", $("How do you lose refugee status?")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add("state_201", function(name) {
                return new PaginatedState(name, {
                    text: $("An asylum seeker awaits a decision on his/her asylum application. A refugee's application has been approved & given refugee status."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_202", function(name) {
                return new PaginatedState(name, {
                    text: $("If you committed a war crime, a crime against humanity & peace or a serious non-political crime outside SA. Or; if you have refugee status in another country."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_203", function(name) {
                return new PaginatedState(name, {
                    text: $("If you get protection or nationality in your country of origin or in a new country; or return to settle in the country you fled. If you no longer feel threatened & take on protection of your country of origin because circumstances have changed. New circumstances means there isn't a risk of persecution. The solutions in your country must be effective & long-lasting."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add("state_021", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Select an option:"),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                options_per_page: null,
                choices: [
                    new Choice("state_211", $("Who is an asylum seeker?")),
                    new Choice("state_212", $("Your rights")),
                    new Choice("state_213", $("When to apply")),
                    new Choice("state_214", $("Where to apply")),
                    new Choice("state_215", $("Tips for the RRO")),
                    new Choice("state_216", $("Your duties")),
                    new Choice("state_217", $("The application process")),
                    new Choice("state_218", $("Help with interpreting")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add("state_211", function(name) {
                return new PaginatedState(name, {
                    text: $("If you applied for protection as a refugee, but are still waiting for a final answer on your formal refugee status. Or; if you submitted an asylum application with the Dept. of Home Affairs (DHA), but are still waiting for a decision on your asylum claim."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_212", function(name) {
                return new PaginatedState(name, {
                    text: $("It's your right to have your asylum application processed and decided upon in a fair and transparent way. It's your right not to be deported to your country of origin while your application is awaiting a decision. It's your right not to be prosecuted for unlawful entry or your presence in SA while your application is awaiting a decision."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_213", function(name) {
                return new PaginatedState(name, {
                    text: $("Apply for asylum as soon as possible after your entry into SA, by visiting a Refugee Reception Office (RRO). If you bump into a police or immigration officer before you've applied for asylum, you must say you are going to apply. If a police or immigration officer arrests or detains you, contact the LHR for legal help. TIP: The asylum process is hard. You may queue for weeks before you get help. You won't get proof that you've been queueing. TIP: Until you receive a Section 22 permit, the police or immigration can arrest you. Contact LHR for legal help if you are arrested."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_214", function(name) {
                return new PaginatedState(name, {
                    text: $("There are Refugee Reception Offices (RRO) in Cape Town, Durban, Musina and Pretoria. Click 'Next' to find the nearest office. Cape Town (Nyanga):142 Voortrekker Road,Maitland 021-514-8414 Fax:021-514-8403 No new applications, only renewals of existing asylum seekers. Durban: 132 Moore Street. 031-362-1205 Fax: 031-362-1220. Musina: 8 Harold Street (next to the post office) 015-534-5300 Fax: 015-534-5332. Pretoria: Marabastad, corner E'skia Mphahlele & Struben Street, Pretoria West. 012-327-3515 Fax: 012-327-5782. Pretoria (TIRRO): 203 Soutter Street, Pretoria Showgrounds. 012-306-0800 or 012-306-0806 Fax: 086-579-7823"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_215", function(name) {
                return new PaginatedState(name, {
                    text: $("The RRO sees a fixed number of people per day. Go early to make sure you get a place. Some people start queueing at 3am. Take warm clothes, food, water or money to buy food with you. Look out for notices posted at the RRO that may contain important information. Ask for advice from refugees who have gone through the process. Ask about the different queues for new arrivals, renewals & ID documents. If you have a community representative, ask if they have useful information for you from the refugee office. It is important to follow the process. Don't ask for special treatment - it may damage your case. Remember to keep your appointments. This will reduce your waiting time - and everybody else's. There are 5 refugee reception offices in SA. Go to the office closest to you on the day allocated to your nationality. SADC: Mon & Tue. East Africa: Wed & Sat. West Africa: Thurs. Asia & other countries: Fri. Hours: 7am - 5pm weekdays, 8am - 1pm Saturdays."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_216", function(name) {
                return new PaginatedState(name, {
                    text: $("Asylum seekers & refugees are protected by SA's Constitution when they obey the law & accept the asylum seeker's duties. It's your duty to go to the RRO when you arrive in SA and truthfully explain why you want asylum. It's your duty to obey the law. If you commit a crime in SA you will be prosecuted like any other South African. Peace is your right and duty. If you assist in armed attacks against your country, you may lose your refugee status & go to jail."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_217", function(name) {
                return new ChoiceState(name, {
                    question: $("Select an option:"),
                    choices: [
                        new Choice("state_170", $("Eligibility form")),
                        new Choice("state_171", $("Section 22 permit")),
                        new Choice("state_172", $("Interview")),
                        new Choice("state_173", $("Successful applications")),
                        new Choice("state_174", $("Unsuccessful applications")),
                        new Choice("state_175", $("Appeal: rejected applications")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_170", function(name) {
                    return new PaginatedState(name, {
                        text: $("Fill out the Eligibility form. Answer honestly. You will be interviewed later so your answers must be the same. Bring with you all documents that show who you are & where you come from. Copies will be taken so you keep the originals. After fingerprints are taken, a case number & file number will be given. Write down these important numbers. Man & wife must both be interviewed if applying together. Name your wife or children in another country to add them to your file. English not good? Take an interpreter with you. If you cannot, one will be arranged for another day & you'll come back on that day. You may have to pay an interpreter. Don't pay anyone else – no officials, no security guards. The process is free. Fight corruption. TIP: If a DHA official asks for a bribe, get his/her name. Note down the official's physical features, the day & time it happened. TIP: There is no need to pay fees. Call the DHA's toll-free hotline to report corruption. You will stay anonymous. 0800-601-190"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_171", function(name) {
                    return new PaginatedState(name, {
                        text: $("You will get a Section 22 permit (Asylum-seeker's permit) when you apply. It is proof you have applied. You are not yet a refugee. Your permit lets you work or study in SA. Sign it. Check the permit conditions or ask. Know if it's valid for 1 month or 3. Make a copy of the permit. Always carry it with you. Keep renewing it before it expires. A decision can take months or years.TIP: If you don't renew your Section 22 permit before it expires, you could be arrested & detained or pay a fine."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_172", function(name) {
                    return new PaginatedState(name, {
                        text: $("This important interview may happen on the day you get your Section 22 permit. Expect questions about yourself & your country. You may bring a legal representative or interpreter and be asked about the places, languages, leaders, history of your country. Your representative can only observe the interview. You can also bring witnesses, affidavits or other evidence to help you. You will get a decision on the day or later. Ask the interviewer when. If later, get your permit stamped before you leave."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_173", function(name) {
                    return new PaginatedState(name, {
                        text: $("If your application is approved, you'll get a Section 24 permit (Refugee Status permit). Now you're officially a refugee in SA! Your permit is valid for 2 years or sometimes 4 years. You must renew it 3 months before it expires. Go to the relevant RRO for a renewal. Refugees can apply for a refugee Identity Document (a maroon 'ID' or smart card) & travel documents. It may take time. Only apply for travel documents if you have a refugee identity document (ID). You must be interviewed by a UNHCR representative. If you don't have a refugee ID but must travel out of SA for an emergency, contact a legal counselor or UNHCR Pretoria. TIP: Remember, if you use a travel document to travel back to your country, you could lose your refugee status in SA."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_174", function(name) {
                    return new PaginatedState(name, {
                        text: $("A rejected application by a RRO officer means they don't recognise you as a refugee. You can appeal this decision at the RAB. Hand in a notice of appeal within 30 days. The reason for your rejection will affect your appeal. If you don't want to appeal, you must document your stay in another way, or leave the country. If your application was found to be fraudulent or abusive, the Standing Committee of Refugee Affairs will automatically review it. You may give the committee a written statement on why you disagree with the decision - but you cannot appear in person. Within 14 days, submit your statement to the RRO that issued the rejection letter. Ask a LHR legal counsellor for help."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_175", function(name) {
                    return new PaginatedState(name, {
                        text: $("The Refugee Appeal Board offers asylum seekers with rejected applications a second chance to prove their claims. Within 30 days, submit an appeal request to the RRO that issued the rejection letter. Say why you disagree with the decision. The RRO will hand the case over to the Refugee Appeal Board. (You can ask LHR for help in requesting an appeal.) To get an appeal hearing date, you will be called in to the RRO to present your case & your reasons for applying for asylum. You must appear in person at the RRO to get the appeal hearing date. It cannot be given over the phone. You must get legal assistance to prepare for your appeal. Some NGOs give free legal help. See 'Useful Contacts' for more info. You may get a decision within 90 days of the hearing. It can take longer. Renew your asylum seeker permit while you wait."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
            self.add("state_218", function(name) {
                return new PaginatedState(name, {
                    text: $("Many asylum seekers can't understand or speak any of SA's languages well enough to make their case in front of an official. The DHA may be able to provide an interpreter who speaks your language. If not, you must get your own interpreter. Get an interpreter you can trust. He or she must translate word-for-word what you and the officials are saying. The interpreter should never tell their own version as to why you're fleeing your country. This can damage your case. You must speak slowly to the interpreter. Give him/her time to interpret what you are saying. Don't use interpreters who demand money to make up stories they believe will get you refugee status. Ask to have your statements read back to you. Ask the DHA official to write down any changes you make. Sign the form. These people cannot interpret for you: your legal help; a testifying witness; a representative of your home country."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add("state_022", function(name) {
            return new ChoiceState(name, {
                question: $("Select an option:"),
                choices: [
                    new Choice("state_176", $("Accompanied children")),
                    new Choice("state_177", $("Unaccompanied / separated children")),
                    new Choice("state_178", $("Documentation process: unaccompanied children")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add("state_176", function(name) {
                return new PaginatedState(name, {
                    text: $("If a child enters SA in the care of a relative who is not a parent or grandparent, the caregiver must go to the Children's Court. At the court, the caregiver must apply to be the child's legal guardian - and can then apply for a foster care grant from the DHA. If accompanied by a parent, grandparent or legal guardian, a child's asylum application is included in the adult's documents. Refugee status is given to children or dependants when the head of the family or household's application is approved. In countries where children are persecuted, a child's case for asylum can be stronger than the parents' claims. If the child's case is stronger, then he/she should submit an independent application for asylum. A legal representative, parent or legal guardian must always go with a child asylum seeker to his/her interviews."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_177", function(name) {
                return new PaginatedState(name, {
                    text: $("A child asylum seeker is unaccompanied when there isn't a person present whose main responsibility is to take care of the child. Children who were separated from their parents before or during the flight from their country are also 'unaccompanied' children."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_178", function(name) {
                return new PaginatedState(name, {
                    text: $("Children without a parent or guardian must be referred to the Dept. of Social Development. A social worker will be assigned to the child. The social worker will go to the Children's Court. The court will confirm if the child is in need of care. The social worker will verify the child's placement in a temporary place of safety. A report must be compiled. If the child is an asylum seeker, the social worker must work with the DHA to help the child with his/her asylum application at a RRO. The social worker must also investigate the possibility of reuniting the child with their family in their home country. Safety is important. If the unaccompanied child doesn't have an asylum claim, a legal counsellor like LHR must be contacted. The Dept. of Social Development must ensure unaccompanied refugee & asylum children receive protection, shelter, nutrition & social services. This is important: children must be documented as soon as possible, or they risk becoming stateless."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add("state_023", function(name) {
            return new ChoiceState(name, {
                question: $("Select an option:"),
                choices: [
                    new Choice("state_179", $("Renewal of permits")),
                    new Choice("state_180", $("Fines")),
                    new Choice("state_181", $("Lost permits")),
                    new Choice("state_182", $("Permanent residence permits")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add("state_179", function(name) {
                return new PaginatedState(name, {
                    text: $("This is important: you must apply to renew your Section 22 asylum permit at a RRO office before it expires. Some RRO offices have a separate queue for renewals. A DHA official may collect all renewal permits & ask you to wait until several hours. Section 24 permits are valid for  2 - 4 years. Apply for renewal 3 months before your permit expires at a RRO. The Standing Committee of Refugee Affairs (SCRA) may review your refugee status in SA based on the situation in your home country. TIP: Always ask if there is a separate renewal queue for permits. Take all original documents with you when renewing your permit."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_180", function(name) {
                return new PaginatedState(name, {
                    text: $("You will be fined if you do not renew your permit before it expires. To have your permit renewed, you must pay the fine. Payment of the fine means you are guilty of not renewing your permit on time. This could lead to a criminal record. If, under exceptional circumstances, you have a good reason why you could not renew your permit, ask a lawyer for help. A RRO officer will give you the fine & tell you where to pay it. It cannot be more than R1000. If it is, contact a lawyer. Renew your permit at the RRO where you applied for asylum. Or ask a legal advisor to help you with the renewal at another RRO. TIP: You have the right to query a fine that you think was wrongly given. Speak to a lawyer if you are concerned. TIP: Permits are not renewed automatically. Renew your permit before it expires or you may be arrested."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_181", function(name) {
                return new PaginatedState(name, {
                    text: $("Lost permit? Get a statement or affidavit at the police station. Submit the statement with a copy of your permit (if you can) at the RRO. TIP: Lost permits are hard to replace. Make certified copies & give to family or keep it safe. Remember your permit's file & case number."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_182", function(name) {
                return new PaginatedState(name, {
                    text: $("Recognised refugees may apply for  permanent residence. You must have lived in SA for 5 years in a row as a recognised refugee. Consult the Immigration Act of 2002 for more info on the requirements for a permanent residence application. It is important to get a certificate from the Standing Committee for Refugee Affairs (SCRA) saying you will remain a refugee indefinitely. To apply for a permanent residence permit, complete an application form at the SCRA. You can ask a legal counsellor like the LHR for help. Submit the SCRA certificate & the documents required by the Immigration Act, to a regional DHA office (not RRO). See 'Useful Contacts'. TIP: Refugees don't have to pay to submit a permanent residence application. TIP: You need a security clearance certificate from SA police - but not from your country of origin. TIP: You must get an affidavit from the police stating whether or not you have a criminal record in your country of origin."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add("state_024", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Select an option:"),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                options_per_page: null,
                choices: [
                    new Choice("state_locate_me", $("Find Support Service near me")),
                    new Choice("state_189", $("Free legal advice")),
                    new Choice("state_190", $("The legal profession")),
                    new Choice("state_191", $("Arrest & detention")),
                    new Choice("state_192", $("What to do if arrested")),
                    new Choice("state_109", $("Conditions of arrest & detention")),
                    new Choice("state_110", $("Deportation Centre")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            // >> state_locate_me
            self.add("state_189", function(name) {
                return new PaginatedState(name, {
                    text: $("Some university law clinics & human rights organisations offer free legal advice to asylum seekers & refugees. The UNHCR has legal counsellors specialising in refugee law in 5 SA cities. See 'Useful Contacts' for more info. Legal counsellors can advise on your asylum application, or help you with an appeal if your asylum application has been rejected. Counsellors can only give you legal advice. They don't provide accommodation or food. See Social Services for more info."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_190", function(name) {
                return new PaginatedState(name, {
                    text: $("A private practice attorney can also help you with your asylum application, appeal or SCRA review. Ordinarily you need to pay for legal services. Or, contact LHR - they may be able to help or refer you to the right organisation. The Law Society of South Africa has a list of attorneys with experience in refugee law. See 'Useful Contacts' for more info.TIP: Always ask about a lawyer's fees before you accept their services. TIP: Always make sure your lawyer has the right qualifications. If you're unsure contact the Law Society of SA on 012-366-8800."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_191", function(name) {
                return new PaginatedState(name, {
                    text: $("Valid permit holders are safe from arrest or detention - unless you break the law. There are some exceptional circumstances. Police or immigration officials may request proof of your lawful stay in the country. Failing this, you may be arrested or detained. If you are arrested, you must prove that you are allowed to be in SA. You must have a valid Section 22 or 24 permit. Valid permit holders are sometimes arrested on suspicion of carrying false documents. If arrested, contact LHR. Those who must still apply for asylum may run the risk of being arrested. Tell them about your intention to apply, or contact LHR for help. If arrested, you will go to a police station and remain until the DHA verifies your identity. They must do so within 48 hours. Never bribe a police or immigration officer to avoid being arrested or get out of jail. This is against the law! TIP: Always carry your valid permit or certified copy with you. This is proof that you are allowed to stay in SA. Renew your permit on time!"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_192", function(name) {
                return new PaginatedState(name, {
                    text: $("There are legal ways out of your arrest. It may take time. Ask to speak to a lawyer. It is your right. If arrested but you have a valid Section 22 or 24 permit, ask someone to get copies of your permit to the DHA. Sometimes the RRO must first confirm your permit before you can be released. The DHA may detain you while verifying your permit. You cannot be sent back to your country before a decision on your asylum application or appeal has been made. If you didn't apply for asylum before your arrest, tell the officer you will still apply. Give reasons why you have not yet. If you break the law, your asylum application may be turned down & you may be sent home - before or after serving a sentence. Remember: You have the right to get legal representation if you are arrested. TIP: If you go to a magistrate's court, you can ask for 'legal aid'. You will be able to speak to a lawyer for free."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            // >> state_109
            // >> state_110

        self.add("state_025", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Select an option:"),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                options_per_page: null,
                choices: [
                    new Choice("state_230", $("Your employment rights")),
                    new Choice("state_112", $("Setting up your own business")),
                    new Choice("state_113", $("Provincial laws")),
                    new Choice("state_079", $("By-laws")),
                    new Choice("state_350", $("Working for a salary")),
                    new Choice("state_123", $("Unfair discrimination")),
                    new Choice("state_124", $("UIF & Compensation Fund")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add("state_230", function(name) {
                return new PaginatedState(name, {
                    text: $("Every refugee or asylum seeker with a valid permit has the right to work in SA. You can be employed or run your own business. Refugees & asylum seekers can also be formally employed. You don't need an extra work visa."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            // >> state_112
            // >> state_113
            // >> state_079
            self.add("state_350", function(name) {
                return new ChoiceState(name, {
                    question: $("Select an option:"),
                    choices: [
                        new Choice("state_231", $("Your permit")),
                        new Choice("state_232", $("Security or car guard")),
                        new Choice("state_233", $("Nurse")),
                        new Choice("state_234", $("Medicine")),
                        new Choice("state_235", $("Teacher")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_231", function(name) {
                    return new PaginatedState(name, {
                        text: $("Asylum seekers and refugees can work with their permits and don't need an extra work visa."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_232", function(name) {
                    return new PaginatedState(name, {
                        text: $("Security & car guards must register at PSIRA. SA nationals, permanent residents & refugees with immunity can work as guards."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_233", function(name) {
                    return new PaginatedState(name, {
                        text: $("The South African Nursing Council (SANC) processes applications for nurses with qualifications from foreign countries. Refugees with foreign qualifications must register with SANC. You need to submit a set of required documents. Required documents: application letter, CV, letter of support to seek employment in South Africa from Dept. of Health FWMP. And; English Language Proficiency certificate (only if your nursing education wasn't in English) with an average IELTS score of 6. And; SAQA evaluation certificates of Foreign Educational Certificate & professional certificates & your certified refugee permit. If you are already registered in your home country, you must get a SANC affidavit. Your qualification & experience will be evaluated. If you meet the minimum SANC requirements, you must write a SANC entry examination based on your area of competence. If your application is successful, you must submit an application registration form & pay a registration fee."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_234", function(name) {
                    return new PaginatedState(name, {
                        text: $("If you are a qualified medical doctor with refugee status you can apply to register as a doctor in SA. The Department of Health (DOH) employs foreign doctors with the right qualifications & experience in government hospitals. To register, contact the Department of Health's Foreign Workforce Management Programme (FWMP) on 012 312 0467. To register, you need a job offer from a government hospital or health department. Apply for a formal endorsement from FWMP. When you have a job offer & endorsement, apply to register with the Health Professions Council of SA (HPCSA) 012-338-9350."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_235", function(name) {
                    return new PaginatedState(name, {
                        text: $("If you are a public school teacher you need to check your international teaching qualification with the SA Qualifications Authority (SAQA). The SAQA evaluation doesn't guarantee a job. Also register with SA Council for Educators (SACE). Go to www.sace.org.za for more info."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
            // >> state_123
            // >> state_124

        self.add("state_026", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Select an option:"),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                options_per_page: null,
                choices: [
                    new Choice("state_236", $("Your rights")),
                    new Choice("state_237", $("Health care costs")),
                    new Choice("state_238", $("Clinics & hospitals")),
                    new Choice("state_128", $("Trauma assistance")),
                    new Choice("state_129", $("HIV/Aids")),
                    new Choice("state_130", $("More about HIV/AIDS")),
                    new Choice("state_134", $("Help & treatment for sexual abuse")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add("state_236", function(name) {
                return new PaginatedState(name, {
                    text: $("You have the right to basic health & reproductive health care services in SA. You cannot be refused emergency medical treatment. Hospital workers don't always know the rights of refugees & asylum seekers with valid permits. You can contact Lawyers for Human Rights when you've a problem accessing public health services."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_237", function(name) {
                return new PaginatedState(name, {
                    text: $("Refugees & asylum seekers pay the same fees as SA nationals. Take your documents with to prove you're an asylum seeker or refugee. Your fee is determined by a means test. The means test will determine how much your fees will be subsidised. There are 3 income groups: H1, H2 and H3. If you don't have the right documents, you will be placed in the H3 group. H1: you earn less than R36 000 a year. H2: you earn less than R72 000 a year. H3: you earn more than R72 000 a year. Take the following with to hospital: ID, appointment card, payslip or proof of salary & proof of address. TIP: Feeling ill? Go to a clinic close to your house first. You will get a letter for a hospital if they can't help you. TIP: If there's an emergency, go straight to hospital."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_238", function(name) {
                return new PaginatedState(name, {
                    text: $("Clinics provide care for adults & children. Most of the time you will not have to pay to see the doctor or get treatment. Go to the clinic closest to your home. Make an appointment first. If there's an emergency, just go. Wait for a doctor. Take your valid Section 22 or 24 permit with you. If you haven't received it yet, ask an NGO for a letter. See 'Useful Contacts'. After you've seen the doctor, the clinic will give you medicine if you need it. You don't have to pay for the medicine. If you want to go to the hospital, you need a letter from the clinic first. If there's an emergency, go straight to the hospital. Can't pay the public hospital fees? Get an affidavit from the police that states why you can't pay. You can also contact a NGO in the contact list if you can't pay your fees. They may ask the hospital to drop the fees. This is important: if you go to a private doctor or private hospital you will have to pay all the fees yourself."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            // >> state_128
            // >> state_129
            // >> state_130
            // >> state_134

        self.add("state_027", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Select an option:"),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                options_per_page: null,
                choices: [
                    new Choice("state_239", $("Your rights")),
                    new Choice("state_240", $("School education")),
                    new Choice("state_351", $("More about schools")),
                    new Choice("state_140", $("Special needs children")),
                    new Choice("state_243", $("University education")),
                    new Choice("state_244", $("Registration tips")),
                    new Choice("state_245", $("Adult education")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add("state_239", function(name) {
                return new PaginatedState(name, {
                    text: $("Everyone has the right to basic education in SA, including basic adult education."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_240", function(name) {
                return new PaginatedState(name, {
                    text: $("A creche is a preschool day-care centre for children from 1-6 years old. You have to pay a school fee. Can't pay? Try to negotiate with the creche or offer to work in exchange for a cheaper fee. All children in SA must go to school, including refugees & asylum seekers. It's the law. Primary school is for children from 7-13 years old. Secondary school is for children from 13 to 19 years old. Secondary schools can be academic or technical. TIP: Age groups in schools are flexible. A child may be older than their school friends due to unplanned situations. TIP: In most SA government schools a student cannot be more than 2 years older than their grade's age group."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_351", function(name) {
                return new ChoiceState(name, {
                    question: $("Select an option:"),
                    choices: [
                        new Choice("state_241", $("Placement in schools")),
                        new Choice("state_242", $("Registration tips")),
                        new Choice("state_139", $("Fees")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_241", function(name) {
                    return new PaginatedState(name, {
                        text: $("Asylum & refugee children have a right to primary education. They are entitled to access the same schooling as SA children. Register for primary school at the school closest to your house. English not good? Take a friend who can help with you. Schools get full quickly. You need to apply early. Try to apply from July for entry into the school for the following year. If the school closest to your house is full, the school must show you to another school that can help you. If you struggle to register, go back to the school close to your house. They must refer you to the Dept. of Education for help. If the school refuses admission, ask for a letter on the school letterhead signed by the principal. Take it to the Dept. of Education. Still can't find a school for your child? Contact a social service provider for education or LHR. Go to the contact list for more info."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_242", function(name) {
                    return new PaginatedState(name, {
                        text: $("The parent or legal guardian must register the child. Give your family's contact details: physical & postal address & telephone numbers. Provide the school with certified copies of the child and/or parent's permit & the child's inoculation certificate. If you don't have an inoculation certificate you must get one within 3 months from the local municipal clinic."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                // >> state_139
            // >> state_140
            self.add("state_243", function(name) {
                return new PaginatedState(name, {
                    text: $("You can study at a university to further your education or change your education from your home country to a SA degree. A university degree can help you enter the SA job market. Remember: you must have a valid asylum seeker or refugee status permit. You can apply to study at a university or technikon. A technikon is a university of technology with more practical training. Contact the international student office at your chosen university or technikon. Ask for info about their standards."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_244", function(name) {
                return new PaginatedState(name, {
                    text: $("You need to pay an international registration & local tuition fee. Have your academic records evaluated & certified by SAQA. Submit the completed SAQA  form with certified copies of your academic records. The process can take up to 3 months. You must be proficient in English to register. Prove your proficiency by taking one of the following tests: TOEFL, IELTS, PTEEP. Information on scholarships & funding is available online or at the university/technikon's information desk. UNHCR offers a Dafi Scholarship for refugees not older than 28 & who successfully completed their secondary education. The Dafi Scholarship doesn't apply to postgraduate studies. For more info & requirements, see 'Useful contacts'."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_245", function(name) {
                return new PaginatedState(name, {
                    text: $("Some NGOs & refugee communities offer adult education to refugees & asylum seekers. Most adult education programmes are free. Some training centres offer English language courses. Self-help programmes & skills training can be important for job seekers. Adult education programmes also encourage social integration in SA. See 'Useful Contacts' for more info."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add("state_028", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Select an option:"),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                options_per_page: null,
                choices: [
                    new Choice("state_246", $("Your rights")),
                    new Choice("state_247", $("Food & accommodation")),
                    new Choice("state_248", $("Finding accommodation")),
                    new Choice("state_249", $("Evictions")),
                    new Choice("state_250", $("Social assistance grants")),
                    new Choice("state_251", $("Types of grants")),
                    new Choice("state_252", $("Applying for a grant")),
                    new Choice("state_253", $("SASSA offices")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add("state_246", function(name) {
                return new PaginatedState(name, {
                    text: $("You must look after your own social & economic needs. The SA Government, UNHCR & NGO's can only help in exceptional cases. The UNHCR's role is limited in SA, with no camp-based situations. They can't provide for all the needs of asylum seekers. The UNHCR & NGOs give limited assistance in cities with an RRO. Assistance is only for the most vulnerable asylum seekers. Vulnerable asylum seekers include mothers with children who have been in SA for less than 2 months. Or; people with very serious illnesses & disabilities & newly arrived single men with special needs. Assistance can include food & basic accommodation for up to 3 months. Most refugee communities have little material assistance to offer, but can give support to newly arrived asylum seekers. Asylum seekers and refugees can access public services like health care & education."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_247", function(name) {
                return new PaginatedState(name, {
                    text: $("You have the right to food, water & housing. Some organisations can help vulnerable asylum seekers & refugees with this. Remember: Help is limited and for a short time only. You will be expected to support yourself soon afterwards. Some churches and religious centres run soup kitchens or provide help to asylum seekers and refugees. See 'Useful Contacts'  for more info on these churches and religious centres."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_248", function(name) {
                return new PaginatedState(name, {
                    text: $("Some NGOs might help you find short-term solutions, like a shelter or place for the homeless. See 'Useful Contacts' for info. Ask other refugees & asylum seekers for info on accommodation. Check local newspapers for ads. Estate agents can charge a fee. Rent is paid at the beginning of the month. You might have to pay a deposit (a month's rent) before you can move in. If possible, sign a contract with your landlord. Ask him/her what they expect of you as a tenant."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_249", function(name) {
                return new PaginatedState(name, {
                    text: $("The law also protects refugees & asylum seekers from unlawful evictions. The landlord must have a court order before he can evict you. Remember: only a court can force you to leave. You must know when & where the court hearing will take place before the court order is given to you. The landlord cannot threaten you or use force to remove you from the property. Contact the Rental Housing Tribunal 011-630-5035 or 0800-046-873 if there's a dispute or if you feel you've been unfairly treated."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_250", function(name) {
                return new PaginatedState(name, {
                    text: $("Recognised refugees can get social assistance under certain circumstances. This doesn't apply to asylum seekers."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_251", function(name) {
                return new ChoiceState(name, {
                    question: $("Select an option:"),
                    choices: [
                        new Choice("state_352", $("Disability grant")),
                        new Choice("state_353", $("Foster care grants")),
                        new Choice("state_354", $("Social relief grant")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_352", function(name) {
                    return new PaginatedState(name, {
                        text: $("This is a temporary or permanent monthly grant for recognised refugees who can't work due to a mental or physical disability. Recognised refugees who are foster parents of a disabled child under 18, can apply for a care dependency grant."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_353", function(name) {
                    return new PaginatedState(name, {
                        text: $("Recognised refugees who are suitable foster parents can apply to the Dept. of Social Development for a foster care grant. Remember: a court must confirm you are a suitable foster parent. The grants are usually given for a 2 year period."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_354", function(name) {
                    return new PaginatedState(name, {
                        text: $("Limited to SA citizens only, but the SA Government has given this grant (in the form of food vouchers) to non-citizens in need."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
            self.add("state_252", function(name) {
                return new PaginatedState(name, {
                    text: $("Each grant needs a specific set of documents to support your application. Visit www.sassa.gov.za or call SASSA on 0800-60-10-11. You must apply at the SASSA office closest to your home."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_253", function(name) {
                return new PaginatedState(name, {
                    text: $("EASTERN CAPE: BKB Building, cnr Fitzpatrick & Merino Road, Quigney. Tel: 043-707-6300 Email: GrantsEnquiriesEC@sassa.gov.za FREE STATE: African Life Building, 75 St. Andrews Street, Bloemfontein. Tel: 051-410-0804/5 Email: GrantsEnquriesFS@sassa.gov.za GAUTENG: 28 Harrison Street, Johannesburg. Tel: 011-241-8300 Email: GrantsEnquiriesGP@sassa.gov.za KWAZULU-NATAL: 1 Bank Street, Pietermaritzburg. Tel: 033-846-3300 Email: GrantsEnquiriesKZN@sassa.gov.za LIMPOPO: 43 Landros Mare, Polokwane. Tel: 015-291-7400 Email: GrantsEnquiriesLIM@sassa.gov.za MPUMALANGA: 18 Ferreira Street, Nelspruit. Tel: 013-754-9428 Email: GrantsEnquiriesMP@sassa.gov.za NORTH WEST: Master Centre, Industrial, Mafikeng. Tel: 018-388-0060 Email: GrantsEnquiriesNW@sassa.gov.za NORTHERN CAPE: Du Toitspan Building 95-97, Du Toitspan Road, Kimberley. Tel: 053-802-4900 Email: GrantsEnquiriesNC@sassa.gov.za WESTERN CAPE: Golden Acre, Adderley Street, Cape Town. Tel: 021-469-0200 Email: GrantsEnquiriesWC@sassa.gov.za"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add("state_029", function(name) {
            return new ChoiceState(name, {
                question: $("Select an option:"),
                choices: [
                    new Choice("state_254", $("Problems at the bank")),
                    new Choice("state_255", $("Opening a bank account")),
                    new Choice("state_256", $("More banking options")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add("state_254", function(name) {
                return new PaginatedState(name, {
                    text: $("It may be difficult to open a bank account in SA. Most banks want to see a green SA ID before they open a bank account. Banks don't always know the rights of refugees & asylum seekers with valid permits. They may refuse to open bank accounts. Asylum seekers can use their temporary asylum seeker permit as identification. Refugees can use their refugee permit or refugee ID. FNB, Standard Bank & Nedbank accept asylum seekers & refugees. Ask other refugees which bank in your area is refugee-friendly."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_255", function(name) {
                return new PaginatedState(name, {
                    text: $("You must be 16 years or older with a valid asylum seeker permit, refugee permit or refugee ID. You must hand in a proof of residence. This can be a rental contract, telephone bill or utility bill in your name. You need to prove your income with a payslip or affidavit. You also need a small amount of money to put in your bank account. Even if you have the right documents, the bank may decide if they want to give you an account or not. You can also ask a legal counsellor to help you open a bank account."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_256", function(name) {
                return new PaginatedState(name, {
                    text: $("Savings & credit co-operatives often open up bank accounts for refugees. They operate as credit unions. Credit unions are groups of people who save together & lend money to each other. They don't operate as ordinary banks."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add("state_030", function(name) {
            return new ChoiceState(name, {
                question: $("Select an option:"),
                choices: [
                    new Choice("state_257", $("Asylum application")),
                    new Choice("state_258", $("Permits")),
                    new Choice("state_259", $("Support services")),
                    new Choice("state_260", $("Right to work")),
                    new Choice("state_261", $("Health")),
                    new Choice("state_262", $("Education")),
                    new Choice("state_263", $("Safety concerns")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add("state_257", function(name) {
                return new PaginatedState(name, {
                    text: $("The asylum process is hard. You may queue for weeks before you get help. You won't get proof that you've been queueing. Until you receive a Section 22 permit, the police or immigration can arrest you. Contact LHR for legal help if you are arrested. If a DHA official asks for a bribe, get his/her name. Make a note of the official's physical features, the day & time this happened. There is no need to pay any fees. Call the DHA's toll-free hotline to report corruption. You will remain anonymous. 0800-601-190 If you don't renew your Section 22 (asylum seeker) permit before it expires, you could be arrested & detained or pay a fine. Remember, if you use the travel document to travel back to your country, you could lose your refugee status in SA."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_258", function(name) {
                return new PaginatedState(name, {
                    text: $("Always ask if there is a separate renewal queue for permits. Remember to take all original documents with you when renewing your permit. You have the right to question the fine if you think it's wrongly given to you. Speak to a lawyer if you are worried about it. Permits aren't renewed automatically. Renew your permit before it expires. You can get arrested if you have an expired permit. Lost permits are hard to replace. Make certified copies & give to family or keep it safe. Remember your permit's file & case number. Refugees don't have to pay to submit a permanent residence application. You need a security clearance certificate from SA police. You don't need a security clearance certificate from your country of origin. You must get an affidavit from the police declaring whether you have a criminal record in your country of origin."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_259", function(name) {
                return new PaginatedState(name, {
                    text: $("Always ask about a lawyer's fees before you accept their services. Always ensure your lawyer has the right qualifications. If you're unsure contact the Law Society of SA on 012-366-8800. Always carry your valid permit or certified copy with you. This is proof that you are allowed to stay in SA. Renew your permit on time! If you go to a magistrate's court, you can ask for 'legal aid'. You will be able to speak to a lawyer for free."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_260", function(name) {
                return new PaginatedState(name, {
                    text: $("It's important to obey all the by-laws. If you don't follow the by-laws, you may lose your goods or go to jail."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_261", function(name) {
                return new PaginatedState(name, {
                    text: $("Feeling ill? Go to a clinic close to your house first. You will get a letter for a hospital if they can't help you. If there's an emergency, go straight to hospital. You cannot get HIV through casual contact, like working together, kissing a friend, sharing the same bathroom or kitchen. Contact LoveLife 0800 121 900, Aids Helpline 0800 01 23 22, Aids Hotline 0800 11 06 05 for more info or help."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_262", function(name) {
                return new PaginatedState(name, {
                    text: $("Age groups in schools are flexible. A child may be older than their school friends due to unplanned situations. In most SA government schools a student cannot be more than 2 years older than their grade's age group. You shouldn't pay a registration fee at the school. The public school can't ask your child to leave if you can't pay."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_263", function(name) {
                return new PaginatedState(name, {
                    text: $("Resettlement is possible in exceptional cases, but not an option for many refugees with SA refugee status. It can take more than a year. You'll lose your refugee status when you leave SA through voluntary repatriation. It must be safe for you to return to your country. Family reunification applications must be made to the DHA at the RRO. Only the DHA considers family reunification for refugees."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        // >> state_031

        self.add("state_032", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Select an option:"),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                options_per_page: null,
                choices: [
                    new Choice("state_264", $("Xenophobia")),
                    new Choice("state_265", $("Durable solutions")),
                    new Choice("state_266", $("Resettlement")),
                    new Choice("state_267", $("More about resettlement")),
                    new Choice("state_268", $("Internal relocation")),
                    new Choice("state_269", $("Voluntary repatriation")),
                    new Choice("state_270", $("Family reunification")),
                    new Choice("state_271", $("Tracing")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add("state_264", function(name) {
                return new PaginatedState(name, {
                    text: $("Xenophobia is an irrational hatred towards foreigners or an unreasonable fear or hatred of the unfamiliar persons. If you are a victim of xenophobic attacks, you must report it to the police. Go to the police station closest to your home. You must explain in detail what happened. The police will open a case. You will get a case number. Keep it safe! If you've lost your document, get an affidavit from the police that explains your situation. Go to the RRO for a new permit."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_265", function(name) {
                return new PaginatedState(name, {
                    text: $("Sometimes the UNHCR helps with the movement of refugees from one place to another. This is called relocation. There are 4 relocation options: resettlement, internal relocation, voluntary repatriation & family reunification. Relocation is not part of the asylum process. It only happens when the UNHCR identifies the need for protection. Only recognised refugees will be considered for these relocation options. Asylum seekers will be considered in exceptional cases. A separate status interview will be carried out by the UNHCR. Remember: the UNHCR's outcome can differ from the DHA's process."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_266", function(name) {
                return new PaginatedState(name, {
                    text: $("Resettlement is the assisted movement of a refugee & his/her nuclear family (husband/wife & children) to another country. This is only done in exceptional cases, if SA officials cannot find a safe housing solution for the affected refugees in SA. General SA problems like xenophobia and lack of employment do not meet the requirements for resettlement. The UNHCR will first try to set up a durable environment for you in SA before resettlement is considered. TIP: Resettlement is possible in exceptional cases, but is not an option for most refugees with SA refugee status."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_267", function(name) {
                return new ChoiceState(name, {
                    question: $("Select an option:"),
                    choices: [
                        new Choice("state_355", $("Criteria for resettlement")),
                        new Choice("state_356", $("Applying for resettlement")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_355", function(name) {
                    return new PaginatedState(name, {
                        text: $("Exceptional situations where refugees who are of concern to the UNHCR, are refused entry to SA. This also includes refugees who are of concern to the UNHCR who've had their asylum applications rejected. Situations where the SA government cannot offer suitable protection to refugees faced with a direct threat to life & safety. When SA medical & psychological services cannot meet the needs of survivors of violence & torture. When SA cannot provide the necessary medical care to refugees with specific medical & disability needs. When SA cannot provide the necessary protection to address the needs of women at risk & elderly refugees. Unaccompanied children may be resettled if the child is considered especially vulnerable."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_356", function(name) {
                    return new PaginatedState(name, {
                        text: $("Ask a legal counsellor for help if you fall within one of the 4 relocation categories. You can also contact the UNHCR for advice. Go to the UNHCR on a Monday to make an appointment. Their consultation days are on Tuesdays & Thursdays. If the UNHCR can't find a way to solve your problems in SA, they may consider resettlement options. A final decision will be made based on the information you provided. If the decision is negative, they will notify you in writing. If the UNHCR decides that resettlement is necessary, they will ask a third country to review your application. If the third country is satisfied with your case, an entry visa will be prepared. You must go for a medical examination as part of your resettlement application. You may be interviewed again. The IOM will prepare the travel documents for refugees to be resettled. The whole process can take 1 - 2 years."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
            self.add("state_268", function(name) {
                return new PaginatedState(name, {
                    text: $("Internal relocation is the movement of a refugee/asylum seeker & his/her nuclear family (husband/wife & children) within SA. Internal relocation is for protection purposes. In exceptional situations you may be relocated to get better access to the UNHCR. Internal relocation procedures are the same as resettlement procedures. You can't apply if you simply have transportation needs in SA. If the UNHCR is convinced you need internal relocation, they will find safer locations within SA where you can live. Temporary accommodation & necessary services can be provided. The UNHCR will also arrange transport."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_269", function(name) {
                return new PaginatedState(name, {
                    text: $("Voluntary repatriation happens when refugees freely decide to return to their home countries. To apply, fill in a voluntary repatriation application form. Forms are available at UNHCR, LHR, Wits Law Clinic & UCT Law Clinic. You will be interviewed by a legal counsellor. The counsellor must confirm that the information on your form is correct. Your form will be sent with a recommendation to the UNHCR or the IOM. They will make a final decision & arrange your return. TIP: You will lose refugee status if you leave SA through voluntary repatriation. It must be safe to return to your country."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_270", function(name) {
                return new PaginatedState(name, {
                    text: $("If you lost a family member during the movement between countries, you can ask for the family member to join you in SA. You may ask to join a family member in another country. Under exceptional circumstances the UNHCR can help with transportation. To apply, contact the UCT Law Clinic, LHR or Jesuit Refugee Services. They will help you with the application. TIP: Family reunification applications must be made to the DHA at the RRO. Only the DHA may consider family reunification."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_271", function(name) {
                return new PaginatedState(name, {
                    text: $("Sometimes family members need to be traced before they can be reunited. The SARCS & ICRC help to restore these family links. The Red Cross works with the UNHCR to reunite families. They assist with child protection during the reunification process. The Red Cross can help to reunite unaccompanied & separated children, as well as reuniting the elderly or vulnerable. The Red Cross message system helps to restore contact between family members if the identity & full address of both parties is known. Always give as much info as possible: the missing person's identity, reason for separation and last place of contact. Consult the Red Cross and the Red Crescent if the missing person has been resettled. The success of finding a missing person depends on information given and the accessibility of the area they occupy. The danger posed by armed conflicts or natural disasters, may delay the tracing of a missing person."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add("state_033", function(name) {
            return new ChoiceState(name, {
                question: $("Select an option:"),
                choices: [
                    new Choice("state_146", $("Who is stateless?")),
                    new Choice("state_147", $("Birth registration")),
                    new Choice("state_148", $("South African citizenship")),
                    new Choice("state_149", $("Get legal advice")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            // >> state_146
            // >> state_147
            // >> state_148
            // >> state_149

        self.add("state_034", function(name) {
            return new PaginatedState(name, {
                text: $("SA's Constitution protects the rights of Lesbian, Gay, Bisexual & Transgender individuals (LGBTI). LGBTI victims of unjust treatment must go to the police. LGBTI victims of hate speech may lay a complaint with the SAHRC or approach the Equality Court for relief. The Refugee act states that the LGBTI group can get protection if they are persecuted for their sexual orientation. Don't be afraid to disclose your sexual orientation when applying for asylum. The RRO must treat your claim with confidentiality. Contact LHR or another legal organisation if your claim isn't treated with sensitivity & respect. See Useful Contacts for more info."),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });

        self.add("state_035", function(name) {
            return new ChoiceState(name, {
                question: $("Select an option:"),
                choices: [
                    new Choice("state_141", $("Your rights")),
                    new Choice("state_142", $("Report a case")),
                    new Choice("state_143", $("Get a protection order")),
                    new Choice("state_144", $("Trafficking")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            // >> state_141
            // >> state_142
            // >> state_143
            // >> state_144

        self.add("state_036", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Select an option:"),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                options_per_page: null,
                choices: [
                    new Choice("state_808", $("ARESTA")),
                    new Choice("state_272", $("Asylum seeker")),
                    new Choice("state_802", $("CBRMC")),
                    new Choice("state_273", $("CIPC")),
                    new Choice("state_801", $("CCMA")),
                    new Choice("state_274", $("DAFI Scholarship")),
                    new Choice("state_275", $("Department of Home Affairs (DHA)")),
                    new Choice("state_276", $("Durable solution")),
                    new Choice("state_277", $("Form BI-1590")),
                    new Choice("state_278", $("Family reunification")),
                    new Choice("state_279", $("Family tracing")),
                    new Choice("state_800", $("FAMSA")),
                    new Choice("state_280", $("FWMP")),
                    new Choice("state_281", $("HPCSA")),
                    new Choice("state_282", $("ICRC")),
                    new Choice("state_283", $("IELTS")),
                    new Choice("state_284", $("Immigration Act")),
                    new Choice("state_285", $("IOM")),
                    new Choice("state_286", $("LHR")),
                    new Choice("state_287", $("Non-refoulement")),
                    new Choice("state_807", $("PASSOP")),
                    new Choice("state_288", $("Permanent resident")),
                    new Choice("state_289", $("Persecution")),
                    new Choice("state_806", $("POWA")),
                    new Choice("state_290", $("Prohibited person")),
                    new Choice("state_291", $("PSIRA")),
                    new Choice("state_292", $("PTEEP")),
                    new Choice("state_293", $("RAB")),
                    new Choice("state_294", $("Recognised refugee")),
                    new Choice("state_295", $("Refugees Act No. 130 of 1998")),
                    new Choice("state_296", $("Refugee")),
                    new Choice("state_297", $("Relocation")),
                    new Choice("state_298", $("Resettlement")),
                    new Choice("state_299", $("RRO")),
                    new Choice("state_300", $("RSDO")),
                    new Choice("state_301", $("SACE")),
                    new Choice("state_302", $("SAHRC")),
                    new Choice("state_303", $("SANC")),
                    new Choice("state_304", $("SAQA")),
                    new Choice("state_305", $("SARCS")),
                    new Choice("state_803", $("SAWIMA")),
                    new Choice("state_306", $("SASSA")),
                    new Choice("state_307", $("Section 22 permit")),
                    new Choice("state_308", $("Section 24 permit")),
                    new Choice("state_309", $("Standing Committee of Refugee Affairs (SCRA)")),
                    new Choice("state_310", $("Temporary resident")),
                    new Choice("state_311", $("TOEFL")),
                    new Choice("state_312", $("UIF")),
                    new Choice("state_313", $("Unaccompanied minor")),
                    new Choice("state_314", $("UNHCR")),
                    new Choice("state_315", $("Voluntary repatriation")),
                    new Choice("state_804", $("ZANZAT")),
                    new Choice("state_805", $("ZIPOVA")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add("state_808", function(name) {
                return new PaginatedState(name, {
                    text: $("Agency for Refugee Education, Skills Training and Advocacy"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_272", function(name) {
                return new PaginatedState(name, {
                    text: $("A person who has applied for asylum with the Dept. of Home Affairs & is awaiting a decision on his/her refugee status."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_802", function(name) {
                return new PaginatedState(name, {
                    text: $("Coordinating Body for Refugee and Migrant Communities"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_273", function(name) {
                return new PaginatedState(name, {
                    text: $("Companies & Intellectual Properties Commission."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_801", function(name) {
                return new PaginatedState(name, {
                    text: $("Commission for Conciliation, Mediation and Arbitration"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_274", function(name) {
                return new PaginatedState(name, {
                    text: $("Albert Einstein German Academic Refugee Initiative Fund Scholarship Programme"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_275", function(name) {
                return new PaginatedState(name, {
                    text: $("A department of the South African government responsible for the administration of asylum applications, refugee matters & migrant visas."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_276", function(name) {
                return new PaginatedState(name, {
                    text: $("Long-term solutions for refugees who had problems, incl. movement back to the home country, third country of asylum or integration in SA. "),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_277", function(name) {
                return new PaginatedState(name, {
                    text: $("The Eligibility Determination form. Fill out this form the first time you report to any of the 7 refugee reception offices."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_278", function(name) {
                return new PaginatedState(name, {
                    text: $("When members of the same nuclear family is brought together with the help of the UNHCR & ICRC after approval from DHA."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_279", function(name) {
                return new PaginatedState(name, {
                    text: $("Trying to find & connect members of the same nuclear family (father, mother, brother, sister) with or without the help of the UNHCR or ICRC."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_800", function(name) {
                return new PaginatedState(name, {
                    text: $("Family and Marriage Society of South Africa"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_280", function(name) {
                return new PaginatedState(name, {
                    text: $("Foreign Workforce Management Programme"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_281", function(name) {
                return new PaginatedState(name, {
                    text: $("Health Professions Council of South Africa"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_282", function(name) {
                return new PaginatedState(name, {
                    text: $("International Committee of the Red Cross"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_283", function(name) {
                return new PaginatedState(name, {
                    text: $("International English Language Testing System"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_284", function(name) {
                return new PaginatedState(name, {
                    text: $("This law controls who can enter South Africa & covers deportations."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_285", function(name) {
                return new PaginatedState(name, {
                    text: $("International Organisation for Migration"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_286", function(name) {
                return new PaginatedState(name, {
                    text: $("Lawyers for Human Rights"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_287", function(name) {
                return new PaginatedState(name, {
                    text: $("This means that states may not send asylum seekers & refugees back to countries where their lives & freedom may be in danger."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_807", function(name) {
                return new PaginatedState(name, {
                    text: $("People Against Suffering, Oppression & Poverty"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_288", function(name) {
                return new PaginatedState(name, {
                    text: $("A person who has permission to live in South Africa permanently."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_289", function(name) {
                return new PaginatedState(name, {
                    text: $("Life-threatening violation of human rights because of a person's race, religion, nationality, political opinion or social group."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_806", function(name) {
                return new PaginatedState(name, {
                    text: $("People Opposing Women Abuse"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_290", function(name) {
                return new PaginatedState(name, {
                    text: $("A person without legal documents allowing him/her to stay in SA, deportees or people with infectious diseases."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_291", function(name) {
                return new PaginatedState(name, {
                    text: $("Private Security Industry Regulatory Authority."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_292", function(name) {
                return new PaginatedState(name, {
                    text: $("Placement Test in English for Educational Purposes"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_293", function(name) {
                return new PaginatedState(name, {
                    text: $("Refugee Appeal Board"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_294", function(name) {
                return new PaginatedState(name, {
                    text: $("A person with refugee status in terms of section 24 of the Refugees Act."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_295", function(name) {
                return new PaginatedState(name, {
                    text: $("A law passed by the Parliament of South Africa that controls the treatment of refugees in SA."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_296", function(name) {
                return new PaginatedState(name, {
                    text: $("If you fled from your country in fear of your life because of persecution, armed conflicts, civil upheavals or generalised violence."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_297", function(name) {
                return new PaginatedState(name, {
                    text: $("When a refugee or asylum seeker is transferred from one part of South Africa to another with the help of the UNHCR."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_298", function(name) {
                return new PaginatedState(name, {
                    text: $("The relocation of a refugee from SA to a second country of asylum. This happens with the approval of the UNHCR & country of resettlement."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_299", function(name) {
                return new PaginatedState(name, {
                    text: $("Refugee Reception Office. You must report to the RRO when you first arrive in SA to start the asylum application process."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_300", function(name) {
                return new PaginatedState(name, {
                    text: $("Refugee Status Determination Officer. The RSDO makes the decision about your refugee application."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_301", function(name) {
                return new PaginatedState(name, {
                    text: $("South African Council for Educators"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_302", function(name) {
                return new PaginatedState(name, {
                    text: $("South African Human Rights Commission"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_303", function(name) {
                return new PaginatedState(name, {
                    text: $("South African Nursing Council"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_304", function(name) {
                return new PaginatedState(name, {
                    text: $("South African Qualifications Authority"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_305", function(name) {
                return new PaginatedState(name, {
                    text: $("South African Red Cross Society"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_803", function(name) {
                return new PaginatedState(name, {
                    text: $("Southern African Women's Institute for Migration Affairs"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_306", function(name) {
                return new PaginatedState(name, {
                    text: $("South African Social Security Agency"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_307", function(name) {
                return new PaginatedState(name, {
                    text: $("Temporary, renewable permit for asylum seekers while they await a decision on their asylum application. It allows you to live, work & study in SA."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_308", function(name) {
                return new PaginatedState(name, {
                    text: $("This renewable permit confirms you are a recognised refugee & confirm you may remain in SA."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_309", function(name) {
                return new PaginatedState(name, {
                    text: $("A committee reviewing rejected refugee applications. They certify that a refugee remains a refugee in order to apply for permanent residence."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_310", function(name) {
                return new PaginatedState(name, {
                    text: $("A person with a legal permit allowing him/her to stay in SA for a limited period of time, e.g. tourists, foreign students & business people."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_311", function(name) {
                return new PaginatedState(name, {
                    text: $("Test of English as Foreign Language"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_312", function(name) {
                return new PaginatedState(name, {
                    text: $("Unemployed Insurance Fund"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_313", function(name) {
                return new PaginatedState(name, {
                    text: $("A child under the age of 18 who is in South Africa without a parent or guardian."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_314", function(name) {
                return new PaginatedState(name, {
                    text: $("The United Nations High Commissioner for Refugees. They provide international protection for refugees & promote long-term durable solutions."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_315", function(name) {
                return new PaginatedState(name, {
                    text: $("Voluntary return of a foreign national to their country of origin."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_804", function(name) {
                return new PaginatedState(name, {
                    text: $("SA National Zakat Foundation"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_805", function(name) {
                return new PaginatedState(name, {
                    text: $("Zimbabwe Political Victims Association"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        // >> state_072

        self.add("state_039", function(name) {
            return new PaginatedState(name, {
                text: $("This mobile info system is only a guide. It isn't the same as complete legal advice. Users should contact a law clinic for complex issues. LHR will not be liable for any loss from actions taken as a result of this service. Your registration & personal details are confidential & safe. It will only be used when you've made a follow up request or report to LHR. The registration & the actual mobile application service is free. You will only be charged according to USSD data fees per their usage. LHR reserves the right to terminate usage of this service should there be deemed an abuse of the service."),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });

        self.add("state_040", function(name) {
            return new PaginatedState(name, {
                text: $("Lawyers for Human Rights is a NGO. We aim to promote awareness, protection & enforcement of legal & human rights. Visit www.lhr.org.za"),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });


    // MIGRANT MENU STATES

        self.add('state_060', function(name) {
            return new ChoiceState(name, {
                question: $('Select an option'),
                choices: [
                    new Choice('state_100', $('Who is a refugee?')),
                    new Choice('state_101', $('Who is a migrant?'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add('state_100', function(name) {
                return new PaginatedState(name, {
                    text: $("If you fled from your country in fear of your life due to your race, religion, nationality, gender, political or social group. Or; if your life, safety or freedom in your home country are at risk because of violence, war and civil unrest. Or; if you are married to or depend upon a person who fled their country in fear of their life for the reasons listed. You are entitled to refugee status if you are married to a recognised refugee, even if your own claim was rejected."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_101', function(name) {
                return new PaginatedState(name, {
                    text: $("If you have come to SA to look for a job, study, visit friends & family or run a business. You need to apply for a visa. Remember: a migrant can become a refugee should one of the reasons for refugee status takes place in their country of origin."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add('state_061', function(name) {
            return new ChoiceState(name, {
                question: $('Select your type of application'),
                choices: [
                    new Choice('state_102', $('Temporary & permanent visa applications')),
                    new Choice('state_103', $('Temporary residence visas')),
                    new Choice('state_104', $('Types of temporary visas')),
                    new Choice('state_105', $('Permanent residence visas')),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add('state_102', function(name) {
                return new PaginatedState(name, {
                    text: $("The visa application process has changed. Find out what you will need to apply for a visa in SA. There's more on www.vfsglobal.com. There are 2 types of residence permits: one is temporary, the other is permanent. (A visa is the same as a permit.)"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_103', function(name) {
                return new PaginatedState(name, {
                    text: $("To apply for a temporary residence permit, your passport must be valid. It must stay valid for 30 days after your permit expires. Extend your temporary residence permit 30 days before it expires at any Home Affairs office. You will have to pay a fee. TIP: Hand in your application at any of the 11 VFS Global offices in SA. Go to www.vfsglobal.com for more info.There are 14 types of temporary residence visas. Choose one from this list. Visit www.vfsglobal.com for info on fees, documents & more."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_104', function(name) {
                return new PaginatedChoiceState(name, {
                    question: $('Select an option'),
                    characters_per_page: 160,
                    options_per_page: null,
                    more: $('Next'),
                    back: $('Back'),
                    choices: [
                        new Choice('state_150', $("Treaty")),
                        new Choice('state_151', $("Visitor")),
                        new Choice('state_152', $("Exchange")),
                        new Choice('state_153', $("General work")),
                        new Choice('state_154', $("Retired person")),
                        new Choice('state_155', $("Business")),
                        new Choice('state_156', $("Relative")),
                        new Choice('state_157', $("Corporate")),
                        new Choice('state_158', $("Intra company work transfer")),
                        new Choice('state_159', $("Critical skills")),
                        new Choice('state_160', $("Medical")),
                        new Choice('state_161', $("Study")),
                        new Choice('state_162', $("Transfer of temporary residence")),
                        new Choice('state_163', $("Fix a mistake on a temporary visa"))
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add('state_150', function(name) {
                    return new PaginatedState(name, {
                        text: $("Treaty: When there is a deal between SA & your country. You can enter SA to take part in certain activities or programmes."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_151', function(name) {
                    return new PaginatedState(name, {
                        text: $("Visitor: For short visits to SA to travel, do business, visit family or friends or attend sports events."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_152', function(name) {
                    return new PaginatedState(name, {
                        text: $("Exchange: When you are younger than 25 years & want to take part in an exchange programme between your country & SA."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_153', function(name) {
                    return new PaginatedState(name, {
                        text: $("General work: This allows you to work in SA. You need to prove you have work & meet other conditions, or it will expire after 6 months."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_154', function(name) {
                    return new PaginatedState(name, {
                        text: $("Retired person: When you are elderly & want to retire in SA. There are financial requirements you need to meet."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_155', function(name) {
                    return new PaginatedState(name, {
                        text: $("Business: When you want to open a business or become part of a business in SA. You will need to invest money first."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_156', function(name) {
                    return new PaginatedState(name, {
                        text: $("Relative: When you are a direct family member of a South African citizen or permanent resident."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_157', function(name) {
                    return new PaginatedState(name, {
                        text: $("Corporate: Groups of factory or farm workers can apply for a corporate worker visa. You need a copy of the main corporate visa application."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_158', function(name) {
                    return new PaginatedState(name, {
                        text: $("Intra company work transfer: When the company you work for in your home country sends you to work in their SA office."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_159', function(name) {
                    return new PaginatedState(name, {
                        text: $("Critical skills: When your skills are needed in SA. For a list of critical skills, go to www.vfsglobal.com."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_160', function(name) {
                    return new PaginatedState(name, {
                        text: $("Medical: When you travel to SA for medical care. You can't work or stay longer than 3 months. You must be able to pay for the treatment."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_161', function(name) {
                    return new PaginatedState(name, {
                        text: $("Study: If you are a student and want to study in SA. You can work while you study, but certain rules apply."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_162', function(name) {
                    return new PaginatedState(name, {
                        text: $("Transfer of temporary residence: Lost or stolen passport? Transfer your temporary residence visa to your new passport."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_163', function(name) {
                    return new PaginatedState(name, {
                        text: $("Fix a mistake on a temporary visa: Fix a mistake at any VFS office in SA. You may have to pay a fee."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
            self.add('state_105', function(name) {
                return new PaginatedState(name, {
                    text: $("You & your spouse may need to go for an interview with a Home Affairs officer. Submit a signed BI947 form with your documents & fee. Need proof of your permanent residence visa? Fill in a form on www.vfsglobal.com Make an appointment at VFS. Take your documents & pay a fee. You can fix a mistake on your visa application at any VFS office in SA. You may have to pay a fee."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add('state_062', function(name) {
            return new PaginatedState(name, {
                text: $("Children without a parent or guardian must be referred to the Dept. of Social Development. A social worker will be assigned to the child. The social worker will go to the Children's Court. The court will confirm if the child is in need of care. The social worker will verify the child's placement in a temporary place of safety. A report must be compiled. If the child is a migrant, the social worker must try to find & reunite the family in the country of origin. If the family can't be located & the child can't be returned home, you must contact a legal counsellor. This is important: children must get documented as soon as possible, otherwise they risk becoming stateless."),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });

        self.add('state_063', function(name) {
            return new ChoiceState(name, {
                question: $('Select an option'),
                choices: [
                    new Choice('state_106', $("Legal advice")),
                    new Choice('state_107', $("Arrest & detention")),
                    new Choice('state_108', $("What to do if you're arrested")),
                    new Choice('state_109', $("Conditions of arrest & detention")),
                    new Choice('state_110', $("The Deportation Centre"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add('state_106', function(name) {
                return new PaginatedState(name, {
                    text: $("If you have visa application problems, a lawyer can help with the process. Know your rights! Lawyers for Human Rights (LHR) can offer free advice under certain situations. LHR normally helps asylum seekers and refugees. If you need general legal help with an immigration issue you must hire a private lawyer. TIP: Always ask about a lawyer's fees before you accept their services. TIP: Always ensure your lawyer has the right qualifications. If you're unsure, contact the Law Society of SA on 012-366-8800."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_107', function(name) {
                return new PaginatedState(name, {
                    text: $("Valid permit holders are safe from arrest or detention - unless you break the law. There are other exceptional circumstances. Police or immigration officials may request that you provide proof of your regularised stay in the country. Failing which, you may be arrested or detained. If you are arrested, you must prove that you are allowed to be in SA. Remember: You must have a valid visa. You will go to a police station. You will stay there until the DHA verifies your identity. They need to do so within 48 hours. Never bribe a police or immigration officer to avoid being arrested, or to get out of jail. This is against the law! TIP: Always carry your valid visa or certified copy with you. This is proof that you are allowed to stay in SA."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_108', function(name) {
                return new PaginatedState(name, {
                    text: $("There are legal ways out of your arrest. It may take time. Ask to speak to a lawyer. It is your right. If you are arrested and have a valid visa, ask a friend or family to give copies of your valid documents to the DHA. Remember: You have the right to get legal representation if you are arrested. TIP: If you go to a magistrate's court, you can ask for 'legal aid'. You will be able to speak to a lawyer for free."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_109', function(name) {
                return new PaginatedState(name, {
                    text: $("The immigration or DHA officer should verify your documents within 48 hours. If not, you must be released. It is your responsibility to carry your documentation on you. Otherwise, the officer must assist you in locating your documents. You have the right to a free phone call to get copies of your permit. The officer must attempt to confirm your status with the DHA. It's your right to write a statement to the DHA. In the statement you can disagree with the decision to detain or deport you. You may not be detained for more than 30 days, unless the court confirms, with a warrant, that you can be detained longer than 30 days. You may write a statement to the judge. When the court makes its decision, you must be informed of this in writing."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_110', function(name) {
                return new PaginatedState(name, {
                    text: $("If you are taken to the Deportation Centre, you may contact a lawyer for legal advice. LHR visits the centre every week. Ask your family to notify Lawyers for Human Rights about your situation and that you need help. If you don't have legitimate reasons to stay in SA with the necessary documents, you'll be kept at the centre & deported back home. Contact Lawyers for Human Rights if your conditions of detention are unsafe or violate your dignity."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add('state_064', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('Select an option'),
                characters_per_page: 160,
                options_per_page: null,
                more: $('Next'),
                back: $('Back'),
                choices: [
                    new Choice('state_111', $('Your employment rights')),
                    new Choice('state_112', $('Setting up your own business')),
                    new Choice('state_113', $('Provincial laws')),
                    new Choice('state_079', $('By-laws')),
                    new Choice('state_080', $('Working for a salary')),
                    new Choice('state_123', $('Unfair discrimination')),
                    new Choice('state_124', $('UIF & Compensation Fund'))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add('state_111', function(name) {
                return new PaginatedState(name, {
                    text: $("As a migrant you need a relevant work visa to work in SA. With the right visa you can be employed or run your own business. Remember: if you want to set up your own business in South Africa, you need to have a valid business permit."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_112', function(name) {
                return new PaginatedState(name, {
                    text: $("You must first register your business at the CIPC. Find out if your business needs a licence. If you sell food you need a business licence. To obtain a licence, fill out an application form at your municipality. Take copies of your valid permit with you and pay a small fee. At some municipalities you may have to hand in extra documents, like health & safety inspection certificates. After you've handed in your application, a health & safety officer will visit your business site for inspection. Don't bribe the official! If you don't meet the health & safety rules, you must make the changes required.You won't get a licence until you do. When your business meets all the health & safety rules, you will get your business licence. Now you can start to trade. The health & safety officer may inspect your business site again. You need to follow the health & safety rules at all times. Check whether there is an expiry date on your business licence. If there is, make sure you renew it on time."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_113', function(name) {
                return new PaginatedState(name, {
                    text: $("Every province in SA is allowed to pass laws. Make sure you know the business laws of the area you want to trade in. To trade in KZN, Limpopo, Mpumalanga & North-West Province you need a business licence with health & safety approval. In Limpopo, licences are valid for 1 year. Renew your licence 1 month before it expires or you'll be fined or imprisoned. In KwaZulu-Natal you cannot make changes to the building from which your business trades. You need permission first. Hawkers, peddlars & street vendors in Mpumalanga don't need a licence. You may need to prove that your stall area is assigned to you. You can contact Lawyers for Human Rights in Johannesburg or Pretoria if you need a copy of these laws. See 'Useful Contacts'."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_079', function(name) {
                return new ChoiceState(name, {
                    question: $('Select an option'),
                    choices: [
                        new Choice('state_164', $("About")),
                        new Choice('state_114', $("Cape Town by-laws")),
                        new Choice('state_115', $("Pretoria by-laws")),
                        new Choice('state_116', $("Durban by-laws")),
                        new Choice('state_117', $("Port Elizabeth by-laws")),
                        new Choice('state_118', $("Johannesburg by-laws"))
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add('state_164', function(name) {
                    return new PaginatedState(name, {
                        text: $("The laws of a municipality are called by-laws. By-laws control the way businesses and services work in that area. By-laws are not valid outside of the municipalities in which they are passed. Know the by-laws of the municipality you want to trade in. TIP: It's important to obey all the by-laws. If you don't follow the by-laws, you may lose your goods or go to jail."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_114', function(name) {
                    return new PaginatedState(name, {
                        text: $("The application fee may be cancelled if you can prove you can't pay it. You also need to hand in a written explanation. The city needs to give you enough notice if you are asked to move your business, or if your permit is cancelled. Your permit can be passed on to someone else on death, illness or if you have long-lasting cultural or religious duties. Informal traders can't block traffic or trade next to important or religious buildings, national monuments or fire hydrants. Your trading site must be clean. If you don't follow the by-laws your property can be impounded. You will pay a penalty. If you can't claim your impounded goods within 1 month, it may be sold or destroyed. The city may sell your impounded food products. You can get some money if you paid the penalty & have an inventory list. If you break any of the by-laws you can be fined R5000 or go to prison for 3 months. Go to www.capetown.gov.za for more info."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_115', function(name) {
                    return new PaginatedState(name, {
                        text: $("You can't trade in or next to public facilities (like toilets, pools or parks) or ATMs unless you have permission. You can't trade next to important, religious or heritage buildings or in front of fire hydrants. You can't block any traffic. If your stall is in a public space, it can't be larger than 3 square meters. Your stall and goods must be removed at the end of the day. You may be asked to move your stall for a short while if the city needs to work on the road or the space you're trading in. Your stall must be kept clean at all times. You are not allowed to sleep in your stall at night. You can rent a stall from the local authority. You'll get a lease agreement & a token to prove your lease to the police. Children aren't allowed to trade. If you break any of the by-laws, an authorised official can take away your products. Go to www.tshwane.gov.za or call 012-358-9999 for more information."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_116', function(name) {
                    return new PaginatedState(name, {
                        text: $("Preference will be given to permit applications made by the unemployed, registered taxpayers or those new to the informal sector. Your permit may have an expiry date. Check other conditions like trading hours, products you can trade & allowed stall types. Your permit must be for a specific trading bay. You aren't allowed to build structures for your stall. Your permit can be cancelled if you don't follow the rules, if you give the wrong information or if you sell illegal goods. Before your permit is cancelled, you're allowed to make a written statement first. Go to www.durban.gov.za for more info. You may not sleep in your stall at night. Your products cannot cover a public space area bigger than 6 square meters. No trading next to public & religious buildings, national monuments, homes, CCTV cameras, ATMs, fire hydrants or blocking traffic. You can only use an open-flame or gas fire if you are allowed to cook food. Your stall must be clean at all times."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_117', function(name) {
                    return new PaginatedState(name, {
                        text: $("No trading in public parks, monuments or important buildings, near fire hydrants, ATMs or blocking traffic. Your stall & goods must be removed at the end of the day, unless you have permission from the municipality. You can't sleep in your stall at night or put your stall on a public road or facility. It must be kept clean at all times. You may be asked to move your stall for a short while if the city needs to clean or work in the area where you trade. You cannot sell your products in front of another business that sells the same products. If you trade where you're not allowed to, an official can take away your goods. Remember: you must get a written receipt. Your receipt for impounded goods must say where, when & how you can get your goods back. Unclaimed goods will be sold. If you break the by-laws, you can be fined or imprisoned for up to 3 months. Go to www.nelsonmandelabay.gov.za for more info."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_118', function(name) {
                    return new PaginatedState(name, {
                        text: $("You can rent a stall from the local authority. You'll get a lease agreement & a token to prove your lease to the police. Your stall must be kept clean at all times. You cannot sleep in your stall at night. Your permit may have an expiry date. Check other conditions like trading hours, products you can trade & allowed stall types. No trading in parks, important/religious buildings, public monuments, near fire hydrants, ATMs or blocking traffic. Your goods can't cover a public area bigger than 6 square meters. If you're trading in front of a shop, you can't block the window. If you trade where you're not allowed to, an official can take away your goods. Remember: you must get a written receipt. Your receipt for impounded goods must say where, when & how much it will cost to get your goods back. If you break any of the by-laws you may be fined up to R500 or 3 months in jail. Go to www.joburg.org.za for more info."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
            self.add('state_080', function(name) {
                return new ChoiceState(name, {
                    question: $('Select an option'),
                    choices: [
                        new Choice('state_119', $("Security or car guard")),
                        new Choice('state_120', $("Nurse")),
                        new Choice('state_121', $("Medical doctor")),
                        new Choice('state_122', $("Teacher")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add('state_119', function(name) {
                    return new PaginatedState(name, {
                        text: $("You need a work visa to apply for formal employment. The visa depends on the work you can do. Go to www.vfsglobal.com for info. Security & car guards must register at PSIRA. SA nationals, permanent residents & refugees with immunity can work as guards."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_120', function(name) {
                    return new PaginatedState(name, {
                        text: $("You need a work visa to apply for formal employment. The visa depends on the work you can do. Go to www.vfsglobal.com for info. If you are a qualified nurse with the correct work visa you can apply to work as a nurse in SA. The South African Nursing Council (SANC) processes applications for nurses with qualifications from foreign countries."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_121', function(name) {
                    return new PaginatedState(name, {
                        text: $("You need a work visa to apply for formal employment. The visa depends on the work you can do. Go to www.vfsglobal.com for info. If you are a qualified medical doctor with the correct work visa you can apply to register as a doctor in SA. The Department of Health (DOH) employs foreign doctors with the right qualifications & experience in government hospitals. To register, contact the Department of Health's Foreign Workforce Management Programme (FWMP) on 012 312 0467. To register, you need a job offer from a government hospital or health department. Apply for a formal endorsement from FWMP. When you have a job offer & endorsement, apply to register with the Health Professions Council of SA (HPCSA) 012-338-9350."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_122', function(name) {
                    return new PaginatedState(name, {
                        text: $("You need a work visa to apply for formal employment. The visa depends on the work you can do. Go to www.vfsglobal.com for info. If you are a public school teacher you need to check your international teaching qualification with the SA Qualifications Authority (SAQA). The SAQA evaluation doesn't guarantee a job. Also register with SA Council for Educators (SACE). Go to www.sace.org.za for more info."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
            self.add('state_123', function(name) {
                return new PaginatedState(name, {
                    text: $("There are laws in SA that protect you from discrimination or unfair treatment when you are at work. Your employer can't discriminate against you because you're an immigrant. The law protects you from unfair treatment. The law also protects your minimum working hours, leave, salary & the way you are dismissed."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_124', function(name) {
                return new PaginatedState(name, {
                    text: $("You can claim from the UIF if you end up unemployed because you're sick or have a baby. You need a 13-digit ID number to claim. If you are hurt or become infected with a disease at work & you end up being disabled, the Compensation Fund will pay out money. If you die because of your injuries your dependants will get money. The Compensation Fund will help to pay the medical bills."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add('state_065', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('Select an option'),
                characters_per_page: 160,
                options_per_page: null,
                more: $('Next'),
                back: $('Back'),
                choices: [
                    new Choice('state_125', $("Your visa holder rights")),
                    new Choice('state_126', $("Health care costs")),
                    new Choice('state_127', $("Clinics & hospitals")),
                    new Choice('state_128', $("Trauma assistance")),
                    new Choice('state_129', $("HIV/AIDS")),
                    new Choice('state_130', $("More about HIV/AIDS")),
                    new Choice('state_134', $("Help & treatment for sexual abuse"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add('state_125', function(name) {
                return new PaginatedState(name, {
                    text: $("Apply for a medical visa in your country before you travel to SA to get medical care. See Temporary Visa section for info. Remember: this visa doesn't mean you will get free health care. You will have to pay for it yourself. Already in SA with a visa? You have the right to access medical care just like anybody else. Hospital workers don't always know the rights of migrants with valid visas. It's your right to access public health services. You can contact Lawyers for Human Rights when you've a problem accessing public health services."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_126', function(name) {
                return new PaginatedState(name, {
                    text: $("People from SADC countries pay the same medical fees as SA residents. You need an ID to prove you're from a SADC country. SADC countries: Angola, Botswana, DRC, Lesotho, Malawi, Mauritius, Mozambique, Namibia, Swaziland, Tanzania, Zambia, Zimbabwe. As a SADC national, your health care payments will be based on how much you earn. There are 3 income groups: H1, H2 and H3. H1: you earn less than R36 000 a year. H2: you earn less than R72 000 a year. H3: you earn more than R72 000 a year. Take the following with to hospital: ID, appointment card, payslip or proof of salary & proof of address. If you don't have the right documents, you will be placed in the H3 group. If you come from a non-SADC country you will pay more than SA citizens to access health care services."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_127', function(name) {
                return new PaginatedState(name, {
                    text: $("Clinics provide care for adults & children. Most of the time you will not have to pay to see the doctor or get treatment. Go to the clinic closest to your home. Make an appointment first. If there's an emergency, just go. Wait for a doctor. After you've seen the doctor, the clinic will give you medicine if you need it. You don't have to pay for the medicine. If you want to go to the hospital, you need a letter from the clinic first. If there's an emergency, go straight to the hospital. Can't pay the public hospital fees? Get an affidavit from the police that states why you can't pay. You can also contact a NGO in the contact list if you can't pay your fees. They may ask the hospital to drop the fees. This is important: if you go to a private doctor or private hospital you will have to pay all the fees yourself. TIP: Feeling ill? Go to a clinic close to your house first. You will get a letter for a hospital if they can't help you."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_128', function(name) {
                return new PaginatedState(name, {
                    text: $("Suffering through a traumatic event like abuse, violence or natural disaster can lead to post-traumatic stress disorder. Signs of post-traumatic stress disorder: struggling to sleep or concentrate, nightmares & headaches. More signs of post-traumatic stress disorder: flashbacks, anxiety, feeling helpless or scared. You should tell a professional about your experience. It's important to share your story if you have post-traumatic stress. During counselling you will talk about your experience & feelings. You can go alone, as a couple, with family or in a group. You can visit the Trauma Clinic in Johannesburg or the Trauma Centre for Survivors of Violence & Torture in Cape Town. There are other trauma clinics across SA that can also help you. Go to the contact list for more information."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_129', function(name) {
                return new PaginatedState(name, {
                    text: $("People who don't know they have HIV can feel healthy for up to 10 years. Know your status & get treatment sooner. HIV weakens your body's power to fight off infections like pneumonia, diarrhoea, tumours & other illnesses. There isn't a cure for HIV or AIDS. Know your status, get the right treatment to help manage HIV & lead a normal life. You can get HIV doing very specific things, like having unprotected sex or using unsterilised needles & syringes. If you are HIV positive & pregnant, your baby can get HIV in the womb or when you give birth or breastfeed. TIP: You cannot get HIV through casual contact, like working together, kissing a friend, sharing the same bathroom or kitchen."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_130', function(name) {
                return new ChoiceState(name, {
                    question: $('Select an option'),
                    choices: [
                        new Choice('state_131', $("HIV-testing")),
                        new Choice('state_132', $("PMTCT")),
                        new Choice('state_133', $("ARV treatment"))
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add('state_131', function(name) {
                    return new PaginatedState(name, {
                        text: $("To know your HIV status you need to get a blood test. You can get tested at most public health centres. The test is free. You'll receive counselling before & after your test. Sometimes two tests are done. You'll know your status after 20 minutes. Your blood sample might have to go to a laboratory. You'll only know your status in a few days. HIV tests are very accurate. Many organisations in SA offer HIV tests, counselling & treatment. Go to www.tac.org.za or the contact list for more info."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_132', function(name) {
                    return new PaginatedState(name, {
                        text: $("Pregnant women with HIV should ask for Nevirapine at public health centres. It can prevent HIV infection during childbirth. Nevirapine is an anti-retroviral drug (ARV). Go to the contact list or www.tac.org.za for info on centres with ARV treatments."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add('state_133', function(name) {
                    return new PaginatedState(name, {
                        text: $("ARV treatment begins during a serious HIV-related illness or when your CD4 count drops below 350. Most people start ARV 8-10 years after infection. It isn't the same for all. See a doctor & get the best treatment for you! Remember: It doesn't matter what your document status is - you are entitled to free ARV treatment."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
            self.add('state_134', function(name) {
                return new PaginatedState(name, {
                    text: $("If you've been raped, go to a police station as soon as possible. However, it's your choice if you want to report the case or not. Don't shower, drink liquids or use the toilet before reporting a rape. This will help the police to collect evidence for a strong case. You can change into new clothes before going to the police, but take the clothes you we wearing with you as evidence. Remember: You don't need to report the case to access medical treatment. Rape or sexual assault victims have the right to a 28-day course of antiretrovirals (ARVs) to prevent HIV. If you choose to get treatment, you must take it within 72 hours of being assaulted. This 28-course of ARV's is for people who were HIV-negative before they were sexually assaulted. TIP: Contact LoveLife 0800 121 900, Aids Helpline 0800 01 23 22, Aids Hotline 0800 11 0605 for more info or help."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add('state_066', function(name) {
            return new ChoiceState(name, {
                question: $('Select an option'),
                choices: [
                    new Choice('state_135', $("Education rights")),
                    new Choice('state_136', $("School education")),
                    new Choice('state_137', $("University education")),
                    new Choice('state_138', $("Placement in schools")),
                    new Choice('state_139', $("School fees")),
                    new Choice('state_140', $("Special needs children"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add('state_135', function(name) {
                return new PaginatedState(name, {
                    text: $("Everyone has the right to basic education in SA. You must have a valid study permit to study in SA. In SA on another valid permit? Check first if your permit allows you to study in SA. Some conditions might apply."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_136', function(name) {
                return new PaginatedState(name, {
                    text: $("A creche is a preschool day-care centre for children from 1-6 years old. You have to pay a school fee. Can't pay? Ask to work in exchange for a cheaper fee. Remember: your child must have a visa and passport to be in SA. Children in SA must go to school. It's the law. Primary school is for children from 7-13 years old. Secondary school is for children from 13 to 19 years old. Secondary schools can be academic or technical. TIP: Age groups in schools are flexible. A child may be older than their school friends due to unplanned situations. TIP: In most SA government schools a student cannot be more than 2 years older than their grade's age group."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_137', function(name) {
                return new PaginatedState(name, {
                    text: $("You can study at a university to further your education or change your education from your home country to a SA degree. A university degree can help you to get into the SA job market. Remember: You must have a valid study permit to study in SA. You can apply to study at a university or technikon. A technikon is a university of technology with more practical training. Contact the international student office at your chosen university or technikon. Ask for info about their standards."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_138', function(name) {
                return new PaginatedState(name, {
                    text: $("Your child must have a visa & passport to be in SA. There will be conditions for your child to attend school during your stay in SA. Register for primary school at the school closest to your house. English not good? Take a friend who can help with you. Schools get full quickly. You need to apply early. Try to apply from July for entry into the school for the following year. If the school closest to your house is full, the school must show you to another school that can help you. If you struggle to register, go back to the school close to your house. They must refer you to the Dept. of Education for help. Still can't find a school for your child? Contact a social service provider for education or LHR. Go to the contact list for more info."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_139', function(name) {
                return new PaginatedState(name, {
                    text: $("You must pay school fees. If you can't pay, you can ask for exemption. This means you can ask the school to cancel/reduce your fees. Ask for an exemption form & complete it. You need to show proof of income & give info on your expenses & responsibilities. Proof of income can be a payslip, an affidavit or letter of support. You must apply for exemption at the start of each term. Remember: keep all your letters & appointments with the school. If you ignore any notices, the school can ask you to pay. Need help filling out the exemption form? Contact a NGO in the contact list & ask for help. School uniforms & learning materials also cost money. Even if you can't afford a uniform, your child must still go to school. Second-hand school uniforms are cheaper. Ask at the school. Your child can also wear normal clothes that resemble the uniform. TIP: You shouldn't pay a registration fee at the school. The public school can't ask your child to leave if you can't pay."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_140', function(name) {
                return new PaginatedState(name, {
                    text: $("Children with special learning needs can go to a special education school. Contact the Dept. of Education & ask about schools. Placing your child in a special education school is a long process. Get your child on a waiting list as soon as possible."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add('state_067', function(name) {
            return new PaginatedState(name, {
                text: $("You must be 16 years or older with a valid passport & visa. You must hand in a proof of residence. This can be a rental contract, telephone bill or utility bill in your name. You need to prove your income with a payslip or affidavit. You also need a small amount of money to put in your bank account. It may be difficult to open a bank account in SA. Most banks want to see a green SA ID before they open a bank account. Even if you have the right documents, the bank can decide if they want to give you an account or not. You can also ask a legal counsellor to help you open a bank account."),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });

        self.add('state_068', function(name) {
            return new PaginatedState(name, {
                text: $("SA's Constitution protects the rights of Lesbian, Gay, Bisexual & Transgender individuals (LGBTI). LGBTI victims of unjust treatment must go to the police. LGBTI victims of hate speech must lay a complaint with the SAHRC. Ask for legal assistance if you're struggling to lodge your claim. Go to the contact list for more info. For LGBTI support in Johannesburg: GALA 011 717 4239. In Pretoria: Out Wellbeing 012 430 3272. In Durban: Gay & Lesbian Network 033 342 6165"),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });

        self.add('state_069', function(name) {
            return new ChoiceState(name, {
                question: $('Select an option'),
                choices: [
                    new Choice('state_141', $("Know your rights")),
                    new Choice('state_142', $("Report a case")),
                    new Choice('state_143', $("Get a protection order")),
                    new Choice('state_144', $("Trafficking")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add('state_141', function(name) {
                return new PaginatedState(name, {
                    text: $("Women & children have the right to live free from physical, verbal or sexual abuse. All types of abuse must be reported to the police. Remember: a protection order can prevent more violence. Violence can mean intimidation, physical, sexual or verbal abuse, being threatened with abuse or when you lose your freedom. Abuse can happen when men feel angry or powerless. Some men feel that women & children are their property. Some women & children accept violence or abuse. They believe violence shows love & that they can't question a man's authority. Abuse of women & children is illegal in SA. Not all abusers are men. Women can also abuse other women. Get free legal help from selected women & children's organisations or call the toll-free helpline 0800150150 for help & counselling."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_142', function(name) {
                return new PaginatedState(name, {
                    text: $("If you or your child suffers from abuse, you must report it to the police. The police will open a criminal case. You must make a statement. You'll get a case number. An officer will investigate your case. Some police stations have special units for domestic violence, sexual offences & child protection. Go to a police station close to your home. If you don't, your case will take longer to process. You'll go for a medical examination & counseling. An officer must take you through the process."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_143', function(name) {
                return new PaginatedState(name, {
                    text: $("If you're afraid of more violence or feel threatened, you can go to court & get a protection order. You don't need a lawyer. A protection order can order your abuser to stop abusing you, to stay away from you or force him/her out of your home. Documents like medical reports & photos of your injuries can help your abuse case. Take them with you to court. If there's enough proof of abuse, you'll get an interim protection order & suspended warrant of arrest. The police will give the protection order to your abuser. If the abuser disobeys the order, you can get him/her arrested. You'll need to go back to court a second time. Your abuser must also be there. The court will listen to your case. The court may give you a final protection order. If your abuser disobeys the order, he/she can get arrested."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_144', function(name) {
                return new PaginatedState(name, {
                    text: $("Human trafficking happens when people are recruited & taken to another country under a false act. They're exploited & cannot leave. Trafficked victims are tricked with false promises of good jobs & better lives. Victims are forced to work under brutal & inhumane conditions. Human trafficking is a form of modern-day slavery. People who force others into trafficking are dangerous & shouldn't be confronted. Call the International Organisation for Migration (IOM) 0800 555999 or go to a police station if you know of someone who has been trafficked."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add("state_070", function(name) {
            return new PaginatedState(name, {
                text: $("Xenophobia is an irrational hatred towards foreigners or an unreasonable fear or hatred of the unfamiliar persons.If you are a victim of xenophobic attacks, you must report it to the police. Go to the police station closest to your home. You must explain in detail what happened. The police will open a case. You will get a case number. Keep it safe! If you've lost your document, get an affidavit from the police that explains your situation. Go to the DHA for a new permit. If you've lost your passport, you must go to your country's embassy & then to the DHA to get a new visa."),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });

        self.add('state_071', function(name) {
            return new ChoiceState(name, {
                question: $('Select an option'),
                choices: [
                    new Choice('state_146', $("Who is stateless?")),
                    new Choice('state_147', $("Birth registration")),
                    new Choice('state_148', $("South African citizenship")),
                    new Choice('state_149', $("Get legal advice"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add('state_146', function(name) {
                return new PaginatedState(name, {
                    text: $("A stateless person doesn't have citizenship in any country. You are also at risk of being stateless if your nationality status is undecided. Not all undocumented persons are considered stateless, e.g. when your birth isn't registered or if you don't have a birth certificate, ID or passport. An undocumented person's risk of being stateless increases when he/she belongs to a certain category or when certain factors are present. These factors include: birth outside your parents' country of nationality, death or desertion of your parent(s). Or; irregular migration across international borders, mixed nationality of your parents, loss of clinic cards or records. Or; if you're close to an international border with high cross-border movement or when the law doesn't allow you to have dual nationality."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_147', function(name) {
                return new PaginatedState(name, {
                    text: $("A birth certificate proves your place of birth & identifies your parent/s. It's also the most important proof of your nationality. South African citizens born outside South Africa are entitled to a South African birth certificate. Foreign children born in South Africa are entitled to a birth certificate. This doesn't mean they're South African citizens. Children born in SA must be registered within 30 days. If you were born in SA, apply for late birth registration. Applications close Dec 2015."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_148', function(name) {
                return new PaginatedState(name, {
                    text: $("You have a claim to SA citizenship if you were born in or outside SA to a parent with SA citizenship at the time of your birth. Or; if you were born in SA to a parent who was a permanent resident of SA at the time of your birth & if you lived in SA until the age of 18. Or; if you have been adopted by a South African citizen, or applied for & received a certificate of naturalisation from the DHA. Or; if you were born in SA & have no other citizenship or nationality or have no right to other citizenship or nationality."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add('state_149', function(name) {
                return new PaginatedState(name, {
                    text: $("If you struggle to register a birth or access nationality in your country of birth, contact LHR on 011-339-1960 or 012-320-2943."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

        self.add('state_072', function(name) {
            return new ChoiceState(name, {
                question: $('Select setting to change:'),
                choices: [
                    new Choice('state_165', $("Language")),
                    new Choice('state_166', $("Country")),
                    new Choice('state_167', $("Status (refugee / migrant)")),
                    new Choice('state_168', $("Back to Main Menu"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add('state_165', function(name) {
                return new ChoiceState(name, {
                    question: $('Please choose your language:'),
                    choices: [
                        new Choice('en', $("English")),
                        new Choice('fr', $("French")),
                        new Choice('am', $("Amharic")),
                        new Choice('sw', $("Swahili")),
                        new Choice('so', $("Somali")),
                    ],
                    next: function(choice) {
                        return go.utils
                            .update_language(self.im, self.contact, choice.value)
                            .then(function() {
                                return 'state_072';
                            });
                    }
                });
            });
            self.add('state_166', function(name) {
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
                                return 'state_072';
                            });
                    }
                });
            });
            self.add('state_167', function(name) {
                return new ChoiceState(name, {
                    question: $('Are you a refugee or migrant?'),
                    choices: [
                        new Choice('refugee', $('I am a refugee')),
                        new Choice('migrant', $('I am a migrant'))
                    ],
                    next: function(choice) {
                        return go.utils
                            .update_status(self.im, self.contact, choice.value)
                            .then(function() {
                                return 'state_072';
                            });
                    }
                });
            });
            self.add('state_168', function(name) {
                return new ChoiceState(name, {
                    question: $("Your new settings have been saved. Brought to you by Lawyers for Humans Rights www.lhr.org.za"),
                    choices: [
                        new Choice('state_main_menu', $("Continue"))
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });

        self.add("state_074", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Select an option:"),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                options_per_page: null,
                choices: [
                    new Choice("state_801", $("CCMA")),
                    new Choice("state_273", $("CIPC")),
                    new Choice("state_275", $("Department of Home Affairs (DHA)")),
                    new Choice("state_800", $("FAMSA")),
                    new Choice("state_280", $("FWMP")),
                    new Choice("state_281", $("HPCSA")),
                    new Choice("state_282", $("ICRC")),
                    new Choice("state_284", $("Immigration Act")),
                    new Choice("state_286", $("LHR")),
                    new Choice("state_807", $("PASSOP")),
                    new Choice("state_288", $("Permanent resident")),
                    new Choice("state_806", $("POWA")),
                    new Choice("state_290", $("Prohibited person")),
                    new Choice("state_291", $("PSIRA")),
                    new Choice("state_301", $("SACE")),
                    new Choice("state_302", $("SAHRC")),
                    new Choice("state_303", $("SANC")),
                    new Choice("state_304", $("SAQA")),
                    new Choice("state_803", $("SAWIMA")),
                    new Choice("state_310", $("Temporary resident")),
                    new Choice("state_312", $("UIF")),
                    new Choice("state_313", $("Unaccompanied minor")),
                    new Choice("state_316", $("Undocumented migrant")),
                    new Choice("state_804", $("ZANZAT")),
                    new Choice("state_805", $("ZIPOVA")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            // >> state_801"
            // >> state_273"
            // >> state_275"
            // >> state_800"
            // >> state_280"
            // >> state_281"
            // >> state_282"
            // >> state_284"
            // >> state_286"
            // >> state_807"
            // >> state_288"
            // >> state_806"
            // >> state_290"
            // >> state_291"
            // >> state_301"
            // >> state_302"
            // >> state_303"
            // >> state_304"
            // >> state_803"
            // >> state_310"
            // >> state_312"
            // >> state_313"
            self.add("state_316", function(name) {
                return new PaginatedState(name, {
                    text: $("A person who doesn't have a valid visa or residence permit needed to be in SA legally."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            // >> state_804"
            // >> state_805"

        self.add("state_075", function(name) {
            return new ChoiceState(name, {
                question: $("Select an option:"),
                choices: [
                    new Choice("state_317", $("Visa application")),
                    new Choice("state_259", $("Support services")),
                    new Choice("state_260", $("Right to work")),
                    new Choice("state_261", $("Health")),
                    new Choice("state_262", $("Education")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });
            self.add("state_317", function(name) {
                return new PaginatedState(name, {
                    text: $("Hand in your application at any of the 11 VFS Global offices in SA. Go to www.vfsglobal.com for more info."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            // >> state_259
            // >> state_260
            // >> state_261
            // >> state_262

    // USEFUL CONTACT STATES

        self.add("state_031", function(name) {
            return new PaginatedChoiceState(name, {
                question: $("Select an option:"),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                options_per_page: null,
                choices: [
                    new Choice("state_360", $("National & Emergency Helplines")),
                    new Choice("state_361", $("National Offices")),
                    new Choice("state_362", $("International Organisations")),
                    new Choice("state_363", $("National NGOs")),
                    new Choice("state_045", $("Gauteng")),
                    new Choice("state_046", $("Western Cape")),
                    new Choice("state_047", $("KwaZulu-Natal")),
                    new Choice("state_048", $("Eastern Cape")),
                    new Choice("state_049", $("Limpopo")),
                    new Choice("state_050", $("Mpumalanga")),
                    new Choice("state_051", $("Northern Cape")),
                    new Choice("state_052", $("North West")),
                    new Choice("state_053", $("Free State")),
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

            self.add("state_360", function(name) {
                return new PaginatedState(name, {
                    text: $("Women Abuse Helpline: 0800-150-150 Childline: 0800-055-555 AIDS Helpline: 0800-012-322 AIDS Hotline: 0800-110-605 National Network on Violence Against Women: 012-348-1234 or 011-838-0411 Be Court Wise: 083-229-9440 UNHCR: 012-338-5302 DHA Assistance Hotline: 0800-60-11-90 DHA Counter-Corruption Line: 0800-701-701 LoveLife: 0800-121-900 LifeLine Counselling Service: 0861-322-322 CCMA: 0861-16-16-16"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });

            self.add("state_361", function(name) {
                return new ChoiceState(name, {
                    question: $("Select an option:"),
                    choices: [
                        new Choice("state_600", $("Dept. of Home Affairs")),
                        new Choice("state_601", $("Refugee Appeal Board of SA")),
                        new Choice("state_602", $("Standing Committee on Refugee Affairs")),
                        new Choice("state_603", $("Dept. of Social Development")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_600", function(name) {
                    return new PaginatedState(name, {
                        text: $("Refugee affairs, admissions into SA, residency services, status of foreigners, issuing permits. 2nd Floor Executive Block, cnr Maggs & Petroleum Street, Waltloo, Pretoria. Tel: 012-810-8099. Cape Town Tel: 021-465- 3456"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_601", function(name) {
                    return new PaginatedState(name, {
                        text: $("The Refugee Appeal Board considers appeals made against the decisions of the Refugee Status Determination Officers. 16th Floor Sanlam Middestad Building, 252 cnr Thabo Sehume & Pretorius Street, Pretoria. Tel: 012-320-1191"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_602", function(name) {
                    return new PaginatedState(name, {
                        text: $("Reviews unfounded decisions on asylum claims & reviews the work of status determination officers. 16th Floor Sanlam Middestad Building, 252 cnr Thabo Sehume & Pretorius Street, Pretoria. Tel: 012-320-0961"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_603", function(name) {
                    return new PaginatedState(name, {
                        text: $("Responsible for social assistance & the care of vulnerable persons such as unaccompanied children. 134 Pretorius Street, HSRC Building, Pretoria. Tel: 012-312-7500/7653"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

            self.add("state_362", function(name) {
                return new ChoiceState(name, {
                    question: $("Select an option:"),
                    choices: [
                        new Choice("state_604", $("UNHCR")),
                        new Choice("state_605", $("UNICEF")),
                        new Choice("state_606", $("Amnesty International SA")),
                        new Choice("state_607", $("IOM")),
                        new Choice("state_608", $("SARCS")),
                        new Choice("state_609", $("ICRC")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_604", function(name) {
                    return new PaginatedState(name, {
                        text: $("Assists the SA government to provide through implementing partners protection to refugees & asylum seekers & finds durable solutions. 8th Floor, Metro Park Building, 351 Francis Baard & Sisulu Streets, Pretoria. Tel: 012-354-8303"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_605", function(name) {
                    return new PaginatedState(name, {
                        text: $("Assists with support for the protection & welfare of children. 6th Floor, Metropark Building, 351 Francis Baard & Sisulu Streets, Pretoria. Tel: 012-354-8200/1"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_606", function(name) {
                    return new PaginatedState(name, {
                        text: $("Promote & advocates on human rights. No 3 Glenhove Road, Ground Floor, Rosebank. Tel: 011-283-6000"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_607", function(name) {
                    return new PaginatedState(name, {
                        text: $("Assists with voluntary repatriation & transportation. 826 Government Avenue, Arcadia, Pretoria. Tel: 012-342-2789"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_608", function(name) {
                    return new PaginatedState(name, {
                        text: $("Gives humanitarian assistance to people affected by conflict & armed violence. Promotes the laws that protect victims of war. 221 Block B, Ground Floor, 1166 Francis Baard Street, Hatfield, Pretoria. Tel: 012-431-8610/12"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_609", function(name) {
                    return new PaginatedState(name, {
                        text: $("Assists with family tracing. 790/794 Church Street, Arcadia, Pretoria. Tel: 012-430-7335"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

            self.add("state_363", function(name) {
                return new PaginatedChoiceState(name, {
                    question: $("Select an option:"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    options_per_page: null,
                    choices: [
                        new Choice("state_610", $("Law Society of SA")),
                        new Choice("state_611", $("Legal Aid SA")),
                        new Choice("state_612", $("FAMSA")),
                        new Choice("state_613", $("SA Human Rights Commission")),
                        new Choice("state_614", $("The Public Protector")),
                        new Choice("state_615", $("Commission on Gender Equality")),
                        new Choice("state_616", $("CCMA")),
                        new Choice("state_617", $("Independent Police Investigative Directorate")),
                        new Choice("state_618", $("Gauteng Rental Housing Tribunal")),
                        new Choice("state_619", $("SAQA")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_610", function(name) {
                    return new PaginatedState(name, {
                        text: $("Assists with the identification of attorneys who specialise in immigration & refugee law in your area. 304 Brooks Street, Menlo Park, Pretoria. Tel: 012-366-8800"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_611", function(name) {
                    return new PaginatedState(name, {
                        text: $("The LAB provides free legal services to people who can't afford private legal assistance in SA. Check your region for a LAB office. 29 De Beer Street, Braamfontein, Johannesburg. Tel: 011-877-2000"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_612", function(name) {
                    return new PaginatedState(name, {
                        text: $("Family & marital counselling. 15 Pascoe Avenue, Kempton Park. Tel: 011-975-7107/1061"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_613", function(name) {
                    return new PaginatedState(name, {
                        text: $("Addresses human rights violations & seeks to resolve such violations through monitoring, advocacy, education & training. 33 Hoofd Street Braampark Forum 3, Braamfontein, Johannesburg. Tel: 011-877-3750/3600"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_614", function(name) {
                    return new PaginatedState(name, {
                        text: $("Receives & investigates complaints from the public against government agencies or officials. Hillcrest Office Park, 175 Lunnon Street, Hillcrest, Pretoria. Tel: 012-366-7000 Toll-free: 0800-112-040"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_615", function(name) {
                    return new PaginatedState(name, {
                        text: $("Promotes gender equality & makes recommendations on any laws & policy which affects gender equality. 2 Kotze Street, Old Women's Jail, East Wing Constitution Hill, Braamfontein, Johannesburg. Tel: 011-403-7182"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_616", function(name) {
                    return new PaginatedState(name, {
                        text: $("Advises on labour rights & codes of good practice in terms of the Labour Relations Act. Mediates in labour related disputes. CCMA National Office, 28 Harrison Street, Johannesburg. Tel: 011-377-6650/6600 Hotline: 011-834-7351. CCMA House, 127 cnr Fox & Eloff Streets (next to Ghandi Square).  Tel: 011-220-5000"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_617", function(name) {
                    return new PaginatedState(name, {
                        text: $("Investigates rights violations by the police. City Forum Building, 114 Madiba street, Pretoria. Tel: 012-399-0000"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_618", function(name) {
                    return new PaginatedState(name, {
                        text: $("Deals with all types of illegal or unfair practices relating to the landlord/tenant relationship. Room 215, Sanlam Plaza East, Pretoria. Tel: 012-358-4403/ 358-4291 Tollfree: 0860-4288-364"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_619", function(name) {
                    return new PaginatedState(name, {
                        text: $("Provides information regarding the evaluation of foreign qualifications. SAQA House, 1067 Arcadia Street, Hatfield, Pretoria. Tel: 012-431-5000 Helpdesk: 086-010-3188"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

            self.add("state_045", function(name) {
                return new PaginatedChoiceState(name, {
                    question: $("Select an option:"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    options_per_page: null,
                    choices: [
                        new Choice("state_364", $("JHB: Governmental Service Providers")),
                        new Choice("state_365", $("JHB: Legal Services")),
                        new Choice("state_366", $("JHB: Basic Needs Service Providers")),
                        new Choice("state_367", $("JHB: Counselling Services")),
                        new Choice("state_368", $("JHB: Shelters")),
                        new Choice("state_369", $("JHB: Soup Kitchens")),
                        new Choice("state_370", $("JHB: Public Health Centres")),
                        new Choice("state_371", $("PTA: Governmental Service Providers")),
                        new Choice("state_372", $("PTA: Legal Service Providers")),
                        new Choice("state_373", $("PTA: Basic Needs Service Providers")),
                        new Choice("state_374", $("PTA: Counselling Services")),
                        new Choice("state_375", $("PTA: Shelters")),
                        new Choice("state_376", $("PTA: Soup Kitchens")),
                        new Choice("state_377", $("PTA: Public Health Centres")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_364", function(name) {
                    return new PaginatedChoiceState(name, {
                        question: $("Select an option:"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        options_per_page: null,
                        choices: [
                            new Choice("state_620", $("Dept. of Home Affairs")),
                            new Choice("state_621", $("Dept. of Home Affairs: OR Tambo Airport")),
                            new Choice("state_622", $("Dept. of Home Affairs: Lindela Repatriation Centre")),
                            new Choice("state_623", $("Dept. of Social Development")),
                            new Choice("state_624", $("JHB Family Court/Regional Civil Court")),
                            new Choice("state_625", $("JHB Magistrate's Court: Civil Section")),
                            new Choice("state_626", $("City of Joburg Migrant Help Desk")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_620", function(name) {
                        return new PaginatedState(name, {
                            text: $("New Government Building, cnr Harrison & Plein Street. Tel: 011-639-4000"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_621", function(name) {
                        return new PaginatedState(name, {
                            text: $("OR Tambo Airport Road, Kempton Park. Tel: 011-941-6200"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_622", function(name) {
                        return new PaginatedState(name, {
                            text: $("10 Tom Muller Road, Krugersdorp West. Tel: 011-662-0500"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_623", function(name) {
                        return new PaginatedState(name, {
                            text: $("Thusanong Building, 69 Commissioner Street. Tel: 011-355-7687/7977/7878"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_624", function(name) {
                        return new PaginatedState(name, {
                            text: $("Decides on family law matters, assists in instituting divorce proceedings. 15 Market Street. Tel: 011-241-6831"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_625", function(name) {
                        return new PaginatedState(name, {
                            text: $("Cnr Fox & Ntemi Piliso Streets, Marshalltown. Tel: 011-491-5097"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_626", function(name) {
                        return new PaginatedState(name, {
                            text: $("Assists migrants with accessing government services in Johannesburg & general advice to migrants. CJ Cronje Building, 80 Loveday Str, JHB. Tel: 011-376-8684. Region C Office: 100 Christiaan De Wet Rd, Florida Park, Tel: 011-761-0270/7"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_365", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_627", $("Wits Law Clinic")),
                            new Choice("state_628", $("LHR")),
                            new Choice("state_629", $("Legal Resources Centre")),
                            new Choice("state_630", $("ProBono.org")),
                            new Choice("state_631", $("LAB Justice Centres")),
                            new Choice("state_632", $("Black Sash")),
                            new Choice("state_633", $("Tshwaranang Legal Advocacy Centre")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_627", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides legal assistance with asylum applications, appeals & reviews rejected applications & other general legal advice. 1 Jan Smuts Ave, Braamfontein.Tel: 011-717-8562"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_628", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides legal help with unlawful arrest, detention & deportation. Helps with asylum applications, appeals & reviews rejected applications. 4th Floor Heerengracht Building, 87 De Korte Street (cnr Melle), Braamfontein Tel: 011-339-1960"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_629", function(name) {
                        return new PaginatedState(name, {
                            text: $("Assists with class action legal cases with an impact on big groups. Bram Fischer Towers, 15th & 16th Floor, 20 Albert Street, Marshalltown. Tel: 011 836-9831"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_630", function(name) {
                        return new PaginatedState(name, {
                            text: $("A legal clearing house who puts immigrants in touch with private lawyers who may help for free. 1st Floor West Wing, Women's Jail, Constitution Hill, 1 Kotze Street, Braamfontein. Tel: 011-339-6080"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_631", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides free legal aid to people who cannot afford private legal assistance. JHB: Sedura Building, 41 Fox Street. Tel: 011-870-1480. ALEXANDRA: 650 Louis Botha Avenue, Kew. Tel: 011-786-3603 BENONI: Bedford Court, 23 Tom Jones Str. Tel: 011-491-1082. GERMISTON: 9th Floor, Standard Bank Towers, President Str. Tel: 011-872-1527 KRUGERSDORP: 3rd Floor, ABSA Building, cnr Krugersdorp & Human Str. Tel: 011-660-2335. SOWETO: Office 403 & 411, Maponya Mall, Klipspruit Tel: 011-988-9011 VEREENIGING: 8 Jasmine Mansions, cnr Leslie & Senator Marks Ave. Tel: 016-421-3527"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_632", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides paralegal assistance to help secure grants & ensures administrative justice for information, education & training. 1st Floor Khotso House, 25 Anderson Street, Marshalltown. Tel: 011-834-8361/5"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_633", function(name) {
                        return new PaginatedState(name, {
                            text: $("Legal counselling/ advice on domestic violence, sexual offenses, maintenance, custody access. 8th Floor Braamfontein Centre, 23 Jorrisen Street, Braamfontein. Tel: 011-403-4267 or 011-403-8230"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_366", function(name) {
                    return new PaginatedChoiceState(name, {
                        question: $("Select an option:"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        options_per_page: null,
                        choices: [
                            new Choice("state_634", $("Jesuit Refugee Services")),
                            new Choice("state_635", $("SARCS")),
                            new Choice("state_636", $("CBRMC")),
                            new Choice("state_637", $("Refugee Ministries Centre")),
                            new Choice("state_638", $("Refugee Children's Project")),
                            new Choice("state_639", $("Central Methodist Church")),
                            new Choice("state_640", $("Papillon Development Centre")),
                            new Choice("state_641", $("Christians for Peace in Africa")),
                            new Choice("state_642", $("African Migrants Solidarity")),
                            new Choice("state_643", $("SAWIMA")),
                            new Choice("state_644", $("ZANZAT")),
                            new Choice("state_645", $("Somali Association of SA")),
                            new Choice("state_646", $("Somali Community Board")),
                            new Choice("state_647", $("African Diaspora Forum")),
                            new Choice("state_648", $("ZIPOVA")),
                            new Choice("state_649", $("Ivorian Community in SA")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_634", function(name) {
                        return new PaginatedState(name, {
                            text: $("Referrals to hospitals and clinics, counselling to refugees infected with HIV/AIDS. Small business assistance. Educational assistance. 493 Marshall Street, Belgravia, JHB Central. Tel: 011-333-0980"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_635", function(name) {
                        return new PaginatedState(name, {
                            text: $("Humanitarian assistance, family tracing, facilitating the sending & receiving of messages from families across conflict zones. 4th Floor Heerengracht Building, 87 De Korte Street, Braamfontein. Tel: 011-339-1992"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_636", function(name) {
                        return new PaginatedState(name, {
                            text: $("Helps with access to primary & secondary education, gives orientation to immigrants arriving in SA, referrals to NGOs on other issues. No.8 Terrace Road, Bertrams, Johannesburg. Tel: 072-222-8755"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_637", function(name) {
                        return new PaginatedState(name, {
                            text: $("Helps asylum applications in JHB & PTA for vulnerable groups. Gives interpretation services & monitoring at RROs incl. Lindela. 34 Cooper Street, Cyrildene, Bruma. Tel: 011-622-8771/ 615-5608"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_638", function(name) {
                        return new PaginatedState(name, {
                            text: $("Supports refugee children. Helps with access to schools, applications for fee exemptions, debt cancellation for unpaid school fees. Assists with providing uniforms & stationery, provides skills training to women & teenagers. Assists with psycho-social support. 111 Kerk St (cnr Mooi), 5th Floor Meubelsentrum Building. Tel: 011-487-0020"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_639", function(name) {
                        return new PaginatedState(name, {
                            text: $("Emergency accommodation for new arrivals. Medical assistance for immigrants. Counselling to refugees infected & affected by HIV/AIDS. Cnr Pritchard & Small Streets. Tel: 011-333-7672"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_640", function(name) {
                        return new PaginatedState(name, {
                            text: $("Fee-based English classes & computer training. Open to migrants who have documentation. Distributor of clothing to orphans & the poor. Cnr Mabel & Lily Streets, Rosettenville. Tel: 011-435-9799"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_641", function(name) {
                        return new PaginatedState(name, {
                            text: $("School matters for asylum seekers & refugees, counselling, second hand clothing distribution & other humanitarian assistance. 23 Melle Street, 12th Floor Management House, Braamfontein. Tel: 072-262-5302 or 011-047-1841."),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_642", function(name) {
                        return new PaginatedState(name, {
                            text: $("20 Albert Street cnr Eloff Street, Braam Fischer Towers, 8th Floor, Marshalltown. Tel: 072-117-3853 or 076-286-1511"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_643", function(name) {
                        return new PaginatedState(name, {
                            text: $("513 Heerengracht Building, 87 De Korte Street, Braamfontein. Tel: 011-339-3900, 079-873-9021 or 084-097-7891"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_644", function(name) {
                        return new PaginatedState(name, {
                            text: $("Services humanitarian assistance, business skills training, bursaries. Focussed on Muslims. 39 Mint Road, Fordsburg. Tel: 011-834-6046"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_645", function(name) {
                        return new PaginatedState(name, {
                            text: $("Information sharing, rights education, welfare coordination, rights protection. 97 7th Avenue (cnr of Church Street), Mayfair. Tel: 011-839-0939"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_646", function(name) {
                        return new PaginatedState(name, {
                            text: $("Humanitarian assistance, welfare, assistance in accessing documentation, integration assistance. 144 Central Avenue, Mayfair. Tel/Fax: 011-837-2910"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_647", function(name) {
                        return new PaginatedState(name, {
                            text: $("24 Rocky Street, Rocky Alley Office 17, Yeoville. Tel: 011-487-0269"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_648", function(name) {
                        return new PaginatedState(name, {
                            text: $("Welfare assistance, paralegal assistance, counselling referrals. 114 Rissik Street, 1st Floor Methodist House, Braamfontein Tel: 072-517-6066"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_649", function(name) {
                        return new PaginatedState(name, {
                            text: $("8 Frances Street, Yeoville, Johannesburg. Tel: 011-487-0885 or 083-514-7367"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_367", function(name) {
                    return new PaginatedChoiceState(name, {
                        question: $("Select an option:"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        options_per_page: null,
                        choices: [
                            new Choice("state_650", $("Centre for the Study of Violence & Reconciliation")),
                            new Choice("state_651", $("Islamic Careline")),
                            new Choice("state_652", $("Islamic Relief SA")),
                            new Choice("state_653", $("JHB Child Welfare")),
                            new Choice("state_654", $("Lifeline")),
                            new Choice("state_655", $("POWA")),
                            new Choice("state_656", $("Sonke Gender Justice Network")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_650", function(name) {
                        return new PaginatedState(name, {
                            text: $("Counselling to survivors of violence & torture. Facilitates support groups & training workshops on complex trauma & trauma management. 4th Floor, Braamfontein Centre, 23 Jorrisen Street, Braamfontein. Tel: 011-403-5102"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_651", function(name) {
                        return new PaginatedState(name, {
                            text: $("Counselling for abused women & children, marital counselling, trauma debriefing, play therapy, HIV/AIDS counselling. 32 Dolly Rathebe Road, Fordsburg. Tel: 011-373-8080/383-6085/6"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_652", function(name) {
                        return new PaginatedState(name, {
                            text: $("Supports orphans, HIV/AIDS counselling & relief, advocacy for refugees & migrants. 57 Mint Road, 1st Floor, Fordsburg. Tel: 011-836-1054 or 0800-111-898"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_653", function(name) {
                        return new PaginatedState(name, {
                            text: $("Counselling & therapy for abused children under the age of twelve years. 1st Floor, Edura House, 41 Fox Str. Tel: 011-298-8500"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_654", function(name) {
                        return new PaginatedState(name, {
                            text: $("Rape counselling for survivors & family, domestic violence counselling & trauma counselling. Face to face counselling by appointment only. 2 The Avenue, Corner Henrietta Street, Norwood. 24hr Crisis Line: 011-728-1347"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_655", function(name) {
                        return new PaginatedState(name, {
                            text: $("Counselling for women, legal advice & court preparation, shelters for abused women. Tel: 011-642-4345/6. 24hr Crisis Line: 083-765-1235"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_656", function(name) {
                        return new PaginatedState(name, {
                            text: $("Addresses gender, HIV & health vulnerabilities through advocacy & training. 62 Judas Str, Stevens Building, Braamfontein. Tel: 011-339-3589"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_368", function(name) {
                    return new PaginatedChoiceState(name, {
                        question: $("Select an option:"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        options_per_page: null,
                        choices: [
                            new Choice("state_657", $("Strabane Mercy Centre")),
                            new Choice("state_658", $("Usindiso Sanctuary")),
                            new Choice("state_659", $("Ekhaya Overnight Shelter")),
                            new Choice("state_660", $("Jabulani Khakibos Kids Centre")),
                            new Choice("state_661", $("Bethany Shelter")),
                            new Choice("state_662", $("Twilight Boys")),
                            new Choice("state_663", $("The House")),
                            new Choice("state_664", $("Freda Hartley Shelter for Women")),
                            new Choice("state_665", $("Place of Refuge")),
                            new Choice("state_666", $("Bienvenue Shelter")),
                            new Choice("state_667", $("Rosebank Mercy Centre")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_657", function(name) {
                        return new PaginatedState(name, {
                            text: $("Only men & women over 30 years of age. Fee: R5 per day. 98 Kerk Street, Johannesburg CBD. Tel: 011-336-2423/484-1590/1"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_658", function(name) {
                        return new PaginatedState(name, {
                            text: $("For abused women - especially those with children. Capacity for 85 women. Fee: Free 80 Albert Str, Marshalltown. Tel: 011-334-1143"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_659", function(name) {
                        return new PaginatedState(name, {
                            text: $("Men & women but no children. R15.00 per night. Claim & Smith Streets, Next to Europa House & Madula Mall, Hillbrow. Tel: 011-042-7084"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_660", function(name) {
                        return new PaginatedState(name, {
                            text: $("For boys who have been on the streets. 1 High Street, Berea. Tel: 011-642-7736 or 084-620-1465"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_661", function(name) {
                        return new PaginatedState(name, {
                            text: $("For abused women. No fee. Cnr Millbourne Road & Viljoen Street, Bertrams. Tel: 011-614-3245"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_662", function(name) {
                        return new PaginatedState(name, {
                            text: $("Shelter for boys. Tel: 011-484-1590/783-1011 Social worker Emily: 072-864-4963"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_663", function(name) {
                        return new PaginatedState(name, {
                            text: $("For girls between 12 & 18 years only. Three month limit dependent on circumstances. 60 Olivia Road 28, Berea, Tel: 074-587-7060"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_664", function(name) {
                        return new PaginatedState(name, {
                            text: $("Only for women & their children. No fee. 97 Regent Street, Yeoville. Tel: 011-648-6005"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_665", function(name) {
                        return new PaginatedState(name, {
                            text: $("For men & women. Cnr Johannesburg Road & 11th Street, La Rochelle. Tel: 011-435-2790 or 011-435-9708"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_666", function(name) {
                        return new PaginatedState(name, {
                            text: $("For newly arrived refugee women & children. 3 month limit. Referrals only. 36 Terrace Rd, Bertrams. Tel: 011-624-2915 082-509-2912"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_667", function(name) {
                        return new PaginatedState(name, {
                            text: $("Single Men. Fee: R5 per night. 17 Sturdee Avenue, Rosebank. Tel: 011-447-4399"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_369", function(name) {
                    return new PaginatedState(name, {
                        text: $("Irene Church: Cnr Belt & End Str, Doornfontein. Cathedral of Christ the King: Saratoga Ave, Joubert Park. Trinity Congregational Church: Cnr Muller & Bedford Str, Yeoville."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_370", function(name) {
                    return new PaginatedState(name, {
                        text: $("Coronationville Hospital: Cnr Fuel & Oudtshoorn Str, Coronationville. Tel: 011-470-9000. Helen Joseph Hospital: Perth Rd, Auckland Park. Tel: 011-489-1011. Hillbrow Community Health Centre: Corner Smit & Klein Str, Hillbrow. Tel: 011-720-1125. Johannesburg General Hospital Jubilee Road, Parktown. Tel: 011-488-4911. Yeoville Clinic Family planning, STD testing, HIV counselling, emergency pill, social worker on Thursdays. Cnr Kenmere & Hopkins Str, Yeoville. 011-648-7979."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_371", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_668", $("Dept. of Home Affairs RRO: Marabastad")),
                            new Choice("state_669", $("Tshwane Interim RRO: PTA Showgrounds")),
                            new Choice("state_670", $("Dept. of Home Affairs")),
                            new Choice("state_671", $("PTA Sexual Offences Court")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_668", function(name) {
                        return new PaginatedState(name, {
                            text: $("Accepts asylum applications from SADC nationals. Cnr E'skia Mphahlele & Struben Street, Pretoria West. Tel: 012-327-3515"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_669", function(name) {
                        return new PaginatedState(name, {
                            text: $("Receives asylum applications in the Pretoria area. 203 Soutter Street. Tel: 012-306-0800/306-0806"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_670", function(name) {
                        return new PaginatedState(name, {
                            text: $("3rd Floor, Sentrakor Building, Pretorius Street. Tel: 012-324-1860/74"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_671", function(name) {
                        return new PaginatedState(name, {
                            text: $("Cnr Francis Baard & Sophie de Bruyn Street. Tel: 012-319-4000"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_372", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_672", $("LHR")),
                            new Choice("state_673", $("LAB Justice Centres")),
                            new Choice("state_674", $("Zimbabwe Exiles Forum")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_672", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides legal assistance with unlawful arrest, detention, deportation & repatriation. Helps with asylum applications, appeals & reviews rejected applications. Advice on family reunification, relocation & resettlement. Kutlwanong Democracy Centre, 357 Visagie Street. Tel: 012-320-2943/4/5"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_673", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides free legal services to people who can't afford private legal assistance. PTA: Cnr Church & Paul Kruger Str, 2nd Floor FNB Building. Tel: 012-401-920. GA-RANKUWA: Shop 23, Ga-Rankuwa City Centre. Tel: 012-700-0595"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_674", function(name) {
                        return new PaginatedState(name, {
                            text: $("Access to documentation, legal advice, human rights violation monitoring. Kutlwanong Democracy Centre, 357 Visagie Street. Tel: 012-322-6969 or 072-639-3796"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_373", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_675", $("Refugee Aid Organisation")),
                            new Choice("state_676", $("Jesuit Refugee Services")),
                            new Choice("state_677", $("Xaveri Movement")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_675", function(name) {
                        return new PaginatedState(name, {
                            text: $("Humanitarian assistance for unaccompanied & separated children. Make an appointment. Cnr Sisulu & Jeff Masemola. 012-320-3773/771-7727"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_676", function(name) {
                        return new PaginatedState(name, {
                            text: $("Health services, vocational skills training, referral letters to hospitals, HIV/AIDS counselling, micro loans & primary education grants. 485 Madiba Street, Arcadia. Tel: 012-323-3116"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_677", function(name) {
                        return new PaginatedState(name, {
                            text: $("Emergency short term accommodation, food parcels, creche (R250 per month), after-school activities. 140 Visagie Str. Tel: 012-326-5311"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_374", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_678", $("FAMSA")),
                            new Choice("state_679", $("Lifeline")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_678", function(name) {
                        return new PaginatedState(name, {
                            text: $("Family & individual counselling. Fees apply. Make an appointment. 234 Lange Street, Brooklyn. Tel: 012-460-0733"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_679", function(name) {
                        return new PaginatedState(name, {
                            text: $("Rape counselling for survivors & family, domestic violence counselling. Face to face counselling by appointment only. 71 Watermeyer Street, Val de Grace. Tel: 012-804-1853/5916/2434 24hr Crisis Line: 012-340-2061"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_375", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_680", $("Pam se Huis")),
                            new Choice("state_681", $("Itumeleng")),
                            new Choice("state_682", $("Mercy House")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_680", function(name) {
                        return new PaginatedState(name, {
                            text: $("Only old-aged persons & persons living with disability. Fee: R900 per month. 885 January Masilela Street, Hermanstad. Tel: 012-379-7338"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_681", function(name) {
                        return new PaginatedState(name, {
                            text: $("Only boys between the ages of 6–18 years. Street children only. Maximum capacity: 18 boys. 53 Plein Str, Sunnyside. Tel: 012-343-1373"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_682", function(name) {
                        return new PaginatedState(name, {
                            text: $("Only accepts referrals from a social worker. For abused women & children. 407 Flower Str, Capital Park, Gezina.Tel: 012-329-5528/6682"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_376", function(name) {
                    return new PaginatedState(name, {
                        text: $("Catholic Church: Cnr Celliers & Jorissen Str. Gauteng Council of Churches: Monthly food parcels. Newcomers must register with the Council. Show proof of asylum / refugee documents & proof of residency in Pretoria. St Alban's Church, Francis Baard Str. Tel: 012-323-5188. Roman Catholic Cathedral: Cnr Bosman & Nana Sita Str. Salvation Army: WF Nkomo Str, Pretoria West."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_377", function(name) {
                    return new PaginatedState(name, {
                        text: $("Pretoria Academic Hospital: Cnr Voortrekker Road & Dr. Savage Str, Gezina. Tel: 012-354-1000. Pretoria West Hospital: Syweirde Str, Pretoria West. Tel: 012-648-7979"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

            self.add("state_046", function(name) {
                return new PaginatedChoiceState(name, {
                    question: $("Select an option:"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    options_per_page: null,
                    choices: [
                        new Choice("state_378", $("Governmental Service Providers")),
                        new Choice("state_379", $("International Organisations")),
                        new Choice("state_380", $("Statutory Bodies")),
                        new Choice("state_381", $("Legal Services")),
                        new Choice("state_382", $("Basic Needs & Shelters")),
                        new Choice("state_383", $("Education & Skills Training")),
                        new Choice("state_384", $("Counselling Services")),
                        new Choice("state_385", $("Public Health Centres")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_378", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_683", $("Dept. of Home Affairs RRO")),
                            new Choice("state_684", $("Dept. of Home Affairs")),
                            new Choice("state_685", $("Dept. of Home Affairs: CT Airport")),
                            new Choice("state_686", $("Dept. of Social Development")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_683", function(name) {
                        return new PaginatedState(name, {
                            text: $("Receives asylum applications in the Cape region. 142 Voortrekker Road, Maitland, Cape Town. Tel: 021-514-8414"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_684", function(name) {
                        return new PaginatedState(name, {
                            text: $("Faircape Building, 56 Barrack Street, Cape Town. Tel: 021-468-4500 or 5th Floor, Customs House, Foreshore, Cape Town. Tel: 021-468-4500"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_685", function(name) {
                        return new PaginatedState(name, {
                            text: $("Tel: 021-380-5130"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_686", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides assistance & social grants to vulnerable people. Union House, 14 Queen Victoria Str, CT. Tel: 021-483-5045 or 021 483-3083/3125"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_379", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_687", $("IOM")),
                            new Choice("state_688", $("UNHCR")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_687", function(name) {
                        return new PaginatedState(name, {
                            text: $("Assists with voluntary return & transportation, migration, health, counter-trafficking & migration information. 80 Strand Street, 2nd Floor, Cape Town. Tel: 021-425-4038"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_688", function(name) {
                        return new PaginatedState(name, {
                            text: $("9-11 Greenmarket Square, 2nd Floor Protea Assurance Building, Cape Town. Tel: 021-483-9860/2783/9859/9858"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_380", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_689", $("SA Human Rights Commission")),
                            new Choice("state_690", $("Commission for Gender Equality")),
                            new Choice("state_691", $("Independent Police Investigative Directorate")),
                            new Choice("state_692", $("CCMA")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_689", function(name) {
                        return new PaginatedState(name, {
                            text: $("7th Floor ABSA Building, 132 Adderley Street, Cape Town. Tel: 021-426-2277"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_690", function(name) {
                        return new PaginatedState(name, {
                            text: $("5th Floor ABSA Building, 132 Adderley Street, Cape Town. Tel: 021-426-4080/3"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_691", function(name) {
                        return new PaginatedState(name, {
                            text: $("Investigates rights violations by the police. Cnr Mazzur & Petrusa Road, Fintrust Building, Bellville. Tel: 021-941-4800"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_692", function(name) {
                        return new PaginatedState(name, {
                            text: $("Assists in the event of unfair labour practices. 78 Darling Street, Cape Town. Tel: 021-469-0111"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_381", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_693", $("UCT Law Clinic")),
                            new Choice("state_694", $("Legal Resources Centre")),
                            new Choice("state_695", $("Black Sash")),
                            new Choice("state_696", $("PASSOP")),
                            new Choice("state_697", $("LAB Justice Centres")),
                            new Choice("state_698", $("LHR")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_693", function(name) {
                        return new PaginatedState(name, {
                            text: $("Legal advice to refugees & asylum seekers. Assistance with appeal hearings. Conducts interviews on behalf of UNHCR in Cape Town. Kramer Law School Building, 1 Stanley Road, Middle Campus, University of Cape Town. Tel: 021-650-5652/2678/5581"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_694", function(name) {
                        return new PaginatedState(name, {
                            text: $("Legal assistance to refugees & asylum seekers in class actions or broad public interest matters. Greenmarket Place, 54 Shortmarket Street, Cape Town. Tel: 021-423-8285"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_695", function(name) {
                        return new PaginatedState(name, {
                            text: $("Black Sash works in three areas in the social protection arena, with an emphasis on women & children. 3rd Floor, Matador Centre, 62 Strand Street, Cape Town. Tel: 021-425-3417"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_696", function(name) {
                        return new PaginatedState(name, {
                            text: $("Paralegal help with education, employment & health care. Networking assistance. 37 Cnr Main Rd & Church Str, Wynberg, CT. Tel: 021-762-7322"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_697", function(name) {
                        return new PaginatedState(name, {
                            text: $("Free legal assistance for people who can't afford private legal assistance. ATHLONE: Melofin Centre, Old Klipfontein Rd. Tel: 021-697-5252. CALEDON: 19 Donkin Str, Caledon. Tel: 028-212-1815 CT: 60 St Georges Mall, Reserve Bank Building 021-426-4074. GEORGE: Tommy Joubert Building, cnr Cradock & Courtenay Str. 044-802-8600. STELLENBOSCH: Eikestad Mall, 2nd Floor, Room 201. Tel: 021-882-9221. VREDENDAL: 9 Dorp Street. Tel: 027-201-1030. WORCESTER: 1st Floor, Nedbank Building, cnr High & Stockenstrom Str. Tel: 023-348-4040"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_698", function(name) {
                        return new PaginatedState(name, {
                            text: $("Legal assistance on farm workers issues. Will facilitate migrants' issues by assisting in contacting LHR in Pretoria or Johannesburg. 4th floor Poyntons Building, 24 Burg Street, Tel: 021-424-4762."),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_382", function(name) {
                    return new PaginatedChoiceState(name, {
                        question: $("Select an option:"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        options_per_page: null,
                        choices: [
                            new Choice("state_699", $("Cape Town Refugee Centre")),
                            new Choice("state_700", $("Catholic Welfare & Development")),
                            new Choice("state_701", $("Scalabrini Centre of Cape Town")),
                            new Choice("state_702", $("African Disabled Refugee Organisation")),
                            new Choice("state_703", $("Islamic Relief SA")),
                            new Choice("state_704", $("Africa Unite")),
                            new Choice("state_705", $("The Ark City of Refuge")),
                            new Choice("state_706", $("Salvation Army")),
                            new Choice("state_707", $("The Haven")),
                            new Choice("state_708", $("Rosemoore Shelter")),
                            new Choice("state_709", $("Saartjie Baartman Centre")),
                            new Choice("state_710", $("SARCS")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_699", function(name) {
                        return new PaginatedState(name, {
                            text: $("Food & accommodation, medical help incl. pregnant women & women with infants, help with accessing schools & unaccompanied minors. 1st Floor Wynberg Centre, 123 Main Road, Wynberg. Tel: 021-762-9670"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_700", function(name) {
                        return new PaginatedState(name, {
                            text: $("Bonne Esperance Shelter for Women & Children: Limited assistance with food, accommodation & clothing, daycare & after-school care for children. Language classes & skills training. Must have referral from Cape Town Refugee Centre. 37a Somerset Road, Cape Town. Tel: 021-425-2095."),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_701", function(name) {
                        return new PaginatedState(name, {
                            text: $("Daily intake for food and clothing. Safeguards human, refugee & labour rights. Trauma counselling. Fee-based training & life skills. Gives information & referrals for access to education, medical, legal & social assistance. 47 Commercial Street. Tel: 021-465-6433"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_702", function(name) {
                        return new PaginatedState(name, {
                            text: $("Rights information, skills training, some food & accommodation assistance. 6 Spin Street, Athlone, Cape Town. Tel: 021-691-0145"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_703", function(name) {
                        return new PaginatedState(name, {
                            text: $("Supports orphans, HIV/AIDS counselling & relief, advocacy for refugees & migrants. 62 Little Road, Athlone, Cape Town. Tel: 021-696-0145"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_704", function(name) {
                        return new PaginatedState(name, {
                            text: $("Promotes human rights & youth development. 6 Spin Street, Cape Town. Tel: 021-461-6551"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_705", function(name) {
                        return new PaginatedState(name, {
                            text: $("Only for the homeless & unemployed. Shelter & food for refugees & asylum seekers with valid permits. CT Refugee Centre referral needed. School facilities, creche, computer classes & skills training. 5 Old Faure Road, Cape Town. Tel: 021-843-3927"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_706", function(name) {
                        return new PaginatedState(name, {
                            text: $("Counselling, shelter & food for abused women & children only. 22 Tarentaal Road, Bridgetown, Cape Town. Tel: 021-638-5511"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_707", function(name) {
                        return new PaginatedState(name, {
                            text: $("R10 per night for adults. R 750.00 monthly fee for pensioners. Ambagvallei Street, Hugenoot, Paarl. Tel: 021-862-1812"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_708", function(name) {
                        return new PaginatedState(name, {
                            text: $("Food & shelter for abused women & children only. Canary street, Rosemoor, George. Tel/Fax: 044-875-1551"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_709", function(name) {
                        return new PaginatedState(name, {
                            text: $("Focuses on abused women. Shelter & various other projects. Cnr Klipfontein & Aries Road, Mannenberg. Tel: 021-633-5287"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_710", function(name) {
                        return new PaginatedState(name, {
                            text: $("Tracing services, assistance in re-uniting vulnerable persons, requests for school, university, birth, marriage or death certificates. 21 Broad Road, Wynberg, Cape Town. Tel: 021-797-5360, 011-887-3259 or 079-887-3259"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_383", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_711", $("ARESTA")),
                            new Choice("state_712", $("Alliance for Refugees in SA")),
                            new Choice("state_713", $("Excelsior Empowerment Centre")),
                            new Choice("state_714", $("St. Joseph's College")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_711", function(name) {
                        return new PaginatedState(name, {
                            text: $("Skills training, psychosocial support groups, advocacy & lobbying. 3 Beverly Str, Athlone CBD, Cape Town. Tel: 021-696-5764"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_712", function(name) {
                        return new PaginatedState(name, {
                            text: $("Skills training, income generation projects, information centre, early childhood development, cultural activities. 9th Floor, Thilbault's House, St George's Street, Cape Town. Tel: 021-421-0111"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_713", function(name) {
                        return new PaginatedState(name, {
                            text: $("Skills development, language classes, soccer events. 1st Floor, Shamdoll Centre, 54 Halt Road, Elsies River. Tel/Fax: 021-932-8585"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_714", function(name) {
                        return new PaginatedState(name, {
                            text: $("Skills training. Bursaries for skills training courses available for refugees & asylum seekers. 21 Belmont Rd, Rondebosch. Tel: 021-685-1257"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_384", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_715", $("The Trauma Centre")),
                            new Choice("state_716", $("Lifeline/Childline")),
                            new Choice("state_717", $("Sonke Gender Justice Network")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_715", function(name) {
                        return new PaginatedState(name, {
                            text: $("Counselling for refugees & asylum seekers who are survivors of torture & trauma. Integration support, information workshops & support groups. Cowley House, 126 Chapel Street, Woodstock. Call to make an appointment. Tel: 021-465-7373"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_716", function(name) {
                        return new PaginatedState(name, {
                            text: $("24 hour telephone counselling services.56 Roeland Street, Cape Town. Tel: 021-461-1113 Crisis: 021-461-1111"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_717", function(name) {
                        return new PaginatedState(name, {
                            text: $("Sexual & reproductive health education for refugees, distribution of condoms, addresses HIV, health vulnerabilities & gender issues. 122 Longmarket Street, 4th Floor Westminster House. Tel: 021-423-7088"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_385", function(name) {
                    return new PaginatedState(name, {
                        text: $("Groote Schuur Hospital: Main Road, Observatory, Cape Town. Tel: 021-404-9111. Tygerberg Hospital: Fransie van Zyl Avenue, Tygerberg. Tel: 021-938-4911. Red Cross Children's Hospital: Klipfontein Road, Rondebosch. Tel: 021-658-5111"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

            self.add("state_047", function(name) {
                return new PaginatedChoiceState(name, {
                    question: $("Select an option:"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    options_per_page: null,
                    choices: [
                        new Choice("state_386", $("Governmental Service Providers")),
                        new Choice("state_387", $("International Organisations")),
                        new Choice("state_388", $("Statutory Bodies")),
                        new Choice("state_389", $("Legal Services")),
                        new Choice("state_390", $("Basic Needs Service Providers")),
                        new Choice("state_391", $("Counselling Services")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_386", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_718", $("Dept. of Home Affairs RRO")),
                            new Choice("state_719", $("Dept. of Home Affairs")),
                            new Choice("state_720", $("Dept. of Social Development")),
                            new Choice("state_721", $("Dept. of Social Development: PMB")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_718", function(name) {
                        return new PaginatedState(name, {
                            text: $("Receives all asylum applications in the KwaZulu-Natal region. 132 Moore Street, Durban. Tel: 031-362-1205"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_719", function(name) {
                        return new PaginatedState(name, {
                            text: $("2nd Floor, United Building, 181 Church Street, Pietermaritzburg. Tel: 039-345-4177"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_720", function(name) {
                        return new PaginatedState(name, {
                            text: $("Room 139, 1st Floor, Esplanade Government Building, Corner Stanger & Victoria Embankment. Tel: 031-360-5444"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_721", function(name) {
                        return new PaginatedState(name, {
                            text: $("208 Hoosen Haffejee Street, Pietermaritzburg. Tel: 033-264-5400"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_387", function(name) {
                    return new PaginatedState(name, {
                        text: $("IOM: Assists with voluntary return & transportation, migration health, counter-trafficking & migration information. Commercial City Building, Suite 1606, 40 Dr. A.D Xuma Road. Tel: 031-304-4057"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_388", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_722", $("SA Human Rights Commission")),
                            new Choice("state_723", $("Commission for Gender Equality")),
                            new Choice("state_724", $("CCMA")),
                            new Choice("state_725", $("Independent Complaints Directorate")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_722", function(name) {
                        return new PaginatedState(name, {
                            text: $("1st Floor, Victoria Embankment, Durban. Tel: 031-304-7323/4/5"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_723", function(name) {
                        return new PaginatedState(name, {
                            text: $("Commercial City Building, 12 Floor, 40 Dr. A.D. Xuma Road Durban. Tel: 031-305-2105"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_724", function(name) {
                        return new PaginatedState(name, {
                            text: $("Embassy Building, 1st Floor Registrations & 7th Floor Hearings, 199 Smith Street, Durban. Tel: 031-362 2300/368-7387"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_725", function(name) {
                        return new PaginatedState(name, {
                            text: $("The Marine Building 3rd Floor, 22 Dorothy Nyembe Street, Durban. Tel: 031-310-1300"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_389", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_726", $("LHR")),
                            new Choice("state_727", $("Legal Resources Centre")),
                            new Choice("state_728", $("ProBono.org")),
                            new Choice("state_729", $("Black Sash")),
                            new Choice("state_730", $("LAB Justice Centres")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_726", function(name) {
                        return new PaginatedState(name, {
                            text: $("Legal help with unlawful arrest, detention, deportation, reunification, resettlement & repatriation. Representation at appeals & reviews. Diakonia Centre, 20 Diakonia Avenue, Durban. Tel: 031-301-0531"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_727", function(name) {
                        return new PaginatedState(name, {
                            text: $("Takes up legal cases that will benefit a group of people. Diakonia Centre, 20 Diakonia Avenue, Durban. Tel: 031-301-7572"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_728", function(name) {
                        return new PaginatedState(name, {
                            text: $("A legal clearing house that puts immigrants in touch with private lawyers who may take on the matter for free. 7th Floor, Salisbury Centre, Tower A, Suite 701-704, 347-351 Dr. Pixley Kaseme, West Street, Durban. Tel: 031-301-6178"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_729", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides paralegal assistance to help secure grants. Ensures administrative justice for information, education & training. Diakonia Centre, 20 Diakonia Avenue, Durban. Tel: 031-301-9215"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_730", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides free legal services to people who can't afford private legal assistance. DURBAN: Salisbury House, 4th Floor, 332 Smith Street. Tel: 031-304 -3290 EMPANGENI: Mazule House, 7 Maxwell Street. Tel: 035-792-4949. LADYSMITH: 371 Murchison. Tel: 036-638-2500. PINETOWN: Upper Ground Floor, 28 Umdoni Centre, Crompton Str. Tel: 031-719-2700. PIETERMARITZBURG: 183 Church Street. Tel: 033-394-2190. PORT SHEPSTONE: Shepstone Mall, Aiken Str. Tel: 039-688-9600. UMLAZI: V1333, Ithala Industrial Park, Corner Road 1902 & Mangosuthu Highway. Tel: 031-918-8100. VERULAM: Suite 1, Ayesha Razak Centre, 23 Groom Street. Tel: 032-533-1020/2654. VRYHEID: Ground Floor Suite, ABSA Building, 199A Church Street. Tel: 034-989-8300"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_390", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_731", $("Refugee Pastoral Care")),
                            new Choice("state_732", $("Refugee Social Services")),
                            new Choice("state_733", $("KZN Refugee Council")),
                            new Choice("state_734", $("SARCS")),
                            new Choice("state_735", $("Union for Refugee Women")),
                            new Choice("state_736", $("Islamic Relief SA")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_731", function(name) {
                        return new PaginatedState(name, {
                            text: $("Food, clothing & shelter for new arrivals. Fee: R18 per night. Aid to unaccompanied minors & help with burials of deceased refugees. Emmanuel Cathedral, Cathedral Road. Tel: 031-307-1074"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_732", function(name) {
                        return new PaginatedState(name, {
                            text: $("Mondays 08:30: orientation for newcomers to the centre. Bring your asylum documentation with you. Room N242, Diakonia Centre, 20 Diakonia Avenue, Durban. Tel: 031-310-3574"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_733", function(name) {
                        return new PaginatedState(name, {
                            text: $("Networking & advocacy with refugee organisations. Skills empowerment. 4th Floor, Industry Building House, Suite 424, 59 Diakonia Avenue, Durban. Tel/Fax: 031-304-9456 or 083-683-8297"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_734", function(name) {
                        return new PaginatedState(name, {
                            text: $("Tracing services, helps with reuniting vulnerable persons with their families. 201 Northway, Durban North. Tel: 031-563-2914"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_735", function(name) {
                        return new PaginatedState(name, {
                            text: $("Fee-based creche for refugee children. 3rd Floor Lionel House, 26 Pickering Street, Point Road. Tel: 031-332-6265"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_736", function(name) {
                        return new PaginatedState(name, {
                            text: $("Supports orphans, HIV/AIDS counselling & relief, advocacy for refugees & migrants. 169 Brickfield Road, Overport, Durban. Tel: 031-208-2838"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_391", function(name) {
                    return new PaginatedState(name, {
                        text: $("Lifeline: 38 Adrian Road, Stamford Hill, Durban. Tel: 031-303-1344 Crisis: 031-312-2323"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

            self.add("state_048", function(name) {
                return new ChoiceState(name, {
                    question: $("Select an option:"),
                    choices: [
                        new Choice("state_392", $("Governmental Service Providers")),
                        new Choice("state_393", $("Statutory Bodies")),
                        new Choice("state_394", $("Legal Services")),
                        new Choice("state_395", $("Basic Needs Service Providers")),
                        new Choice("state_396", $("Counselling Services")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_392", function(name) {
                    return new PaginatedChoiceState(name, {
                        question: $("Select an option:"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        options_per_page: null,
                        choices: [
                            new Choice("state_737", $("Dept. of Home Affairs RRO")),
                            new Choice("state_738", $("Dept. of Home Affairs")),
                            new Choice("state_739", $("Dept. of Home Affairs: Queenstown")),
                            new Choice("state_740", $("Dept. of Social Development: PE")),
                            new Choice("state_741", $("Dept. of Social Development")),
                            new Choice("state_742", $("SAPS")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_737", function(name) {
                        return new PaginatedState(name, {
                            text: $("Accepts all applications for asylum in this region.KIC 5 Sidon Street, North End, Port Elizabeth. Tel: 041-403-7412/13"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_738", function(name) {
                        return new PaginatedState(name, {
                            text: $("Old Etata Building 49, Cnr Owen & Leeds Road, Umtata. Tel: 047-531-1955"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_739", function(name) {
                        return new PaginatedState(name, {
                            text: $("Hexagon Hotel, cnr Cathcart Way & Zeiler Street, Queenstown. Tel: 045-839-2109"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_740", function(name) {
                        return new PaginatedState(name, {
                            text: $("Cnr Straun & Matie Streets, Struandale Tel: 041 406 5700"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_741", function(name) {
                        return new PaginatedState(name, {
                            text: $("Dukumbana Building, Independence Avenue, Bisho. Tel: 040-608-5806"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_742", function(name) {
                        return new PaginatedState(name, {
                            text: $("Cnr Lennox & Mount Streets, Mount Croix, Port Elizabeth. Tel: 041-394-632"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_393", function(name) {
                    return new PaginatedState(name, {
                        text: $("SA Human Rights Commission: 4th Floor, Oxford House, 86-88 Oxford Street, East London. Tel: 043-722-7821"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_394", function(name) {
                    return new PaginatedChoiceState(name, {
                        question: $("Select an option:"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        options_per_page: null,
                        choices: [
                            new Choice("state_743", $("Nelson Mandela Metropolitan University Law Clinic")),
                            new Choice("state_744", $("Legal Resources Centre")),
                            new Choice("state_745", $("Rhodes University Law Clinic")),
                            new Choice("state_746", $("Rhodes University Law Clinic: Queenstown")),
                            new Choice("state_747", $("Black Sash")),
                            new Choice("state_748", $("LAB Justice Centres")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_743", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides free legal assistance to people who can't afford private legal assistance. Missionvale Campus, 1st Floor, Old Education Building, Missionvale, Port Elizabeth. Tel: 041-504-1273"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_744", function(name) {
                        return new PaginatedState(name, {
                            text: $("Takes up constitutional cases that would benefit a group of people. 116 High Street, Grahamstown Tel: 046-622-9230"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_745", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides free legal assistance to people who can't afford private legal assistance. 41 New Street, Grahamstown. Tel: 046-622-9301"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_746", function(name) {
                        return new PaginatedState(name, {
                            text: $("Free legal assistance focusing on farm worker/rural issues. 24 Ebden Street, Queenstown. Tel: 045-838-5600"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_747", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides paralegal assistance to help secure grants & ensures administrative justice for information, education & training. Dorsham House, cnr Elizabeth & Govan Mbeki Avenue, Port Elizabeth. Tel: 041-487-3288"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_748", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides free criminal & civil legal assistance to people who can't afford private legal assistance. PE: 1st Uitenhage, North End. Tel: 041-408-2800. ALIWAL NORTH: 58 Somerset Str. Tel: 051-633-2530. BUTTERWORTH: 52 Blyth Street. Tel: 047-491-3271. EAST-LONDON: 5th Floor, Oxford House, 86 Oxford Street. Tel: 043-704-4700. GRAHAMSTOWN: 69 High Street. Tel: 046-622-9350. GRAAFF-REINET: 64 Church Street. Tel: 049-807-2500. KING WILLIAMS TOWN: 2nd Floor, Old Mutual Building, cnr of Cathcart & Maclean Str. Tel: 043-604-6600. MTHATA: 22 Durham Street Tel: 047-501-4600. QUEENSTOWN: 1st & 2nd Floor, Gentile Building, 2-4 Shepstone Rd. Tel: 045-807-3500. UITENHAGE: 32-36 Baird Street, Uitenhage Central. Tel: 041-991-1811"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_395", function(name) {
                    return new PaginatedChoiceState(name, {
                        question: $("Select an option:"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        options_per_page: null,
                        choices: [
                            new Choice("state_749", $("Nelson Mandela Metropolitan University - Refugee Rights Centre")),
                            new Choice("state_750", $("Diocesan Development Forum")),
                            new Choice("state_751", $("Project for Conflict Resolution & Development")),
                            new Choice("state_752", $("SARCS: PE")),
                            new Choice("state_753", $("SARCS: East London")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_749", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides pro-bono legal services & support to refugees, asylum seekers & migrants. Missionvale Campus, ILA, Faculty of Law, RRC Building, Cuyler Street Central, Missionvale, PE. Tel: 041-540-1310"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_750", function(name) {
                        return new PaginatedState(name, {
                            text: $("Accommodation advice & support to HIV/AIDS patients. 58 St Patrick's Road, Port Elizabeth. Tel: 041-582-4087"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_751", function(name) {
                        return new PaginatedState(name, {
                            text: $("Helps disadvantaged, at-risk communities & organisations to positively deal with conflict & transformation. 63 Heugh Street, Walmer, Port Elizabeth. Tel: 041-581-2414 or 041-581-2417"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_752", function(name) {
                        return new PaginatedState(name, {
                            text: $("Tracing, helps with reuniting vulnerable persons with their families, requests for school, university, birth, marriage & death certificates. 18 Bain Street, Port Elizabeth. Tel: 041-585-6745"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_753", function(name) {
                        return new PaginatedState(name, {
                            text: $("Tracing, helps with reuniting vulnerable persons with their families, requests for school, university, birth, marriage & death certificates. 16 St. Marks Road, Southernwood, East London. Tel: 043-722-2400"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_396", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_754", $("Lifeline")),
                            new Choice("state_755", $("FAMSA")),
                            new Choice("state_756", $("PE Mental Health")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_754", function(name) {
                        return new PaginatedState(name, {
                            text: $("24-hour telephonic crisis counselling. 1 Nile Road, Perridgevale. Tel: 041-373-8882 Crisis: 041-373-8666"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_755", function(name) {
                        return new PaginatedState(name, {
                            text: $("Family & marital counselling. 63A High Street, Grahamstown. Tel: 046-622-2580"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_756", function(name) {
                        return new PaginatedState(name, {
                            text: $("Family counselling. No fee. By appointment. 21 William Street, Cotswold. Port Elizabeth Tel: 041-365-0502"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });

            self.add("state_049", function(name) {
                return new PaginatedChoiceState(name, {
                    question: $("Select an option:"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    options_per_page: null,
                    choices: [
                        new Choice("state_397", $("Governmental Service Providers")),
                        new Choice("state_398", $("International organisations")),
                        new Choice("state_399", $("Statutory Bodies")),
                        new Choice("state_400", $("Legal Service Providers")),
                        new Choice("state_401", $("Basic Needs Service Providers")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_397", function(name) {
                    return new PaginatedChoiceState(name, {
                        question: $("Select an option:"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        options_per_page: null,
                        choices: [
                            new Choice("state_757", $("Dept. of Home Affairs")),
                            new Choice("state_758", $("Dept. of Home Affairs: Musina")),
                            new Choice("state_759", $("Dept. of Home Affairs: Beitbridge")),
                            new Choice("state_760", $("Dept. of Social Development")),
                            new Choice("state_761", $("SAPS: Musina")),
                            new Choice("state_762", $("SAPS: Beitbridge")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_757", function(name) {
                        return new PaginatedState(name, {
                            text: $("Library Gardens, cnr Grobler & Schoeman Street, Polokwane. Tel: 015-963-2269"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_758", function(name) {
                        return new PaginatedState(name, {
                            text: $("N1, Limpopo Lodge, Musina. Tel: 015-534-3232"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_759", function(name) {
                        return new PaginatedState(name, {
                            text: $("Tel: 015-530-0067"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_760", function(name) {
                        return new PaginatedState(name, {
                            text: $("Dept. of Health & Social Development Building, 18 College Street, Polokwane. Tel: 015-293-6004/6054/6011"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_761", function(name) {
                        return new PaginatedState(name, {
                            text: $("Tel: 015-534-7400"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_762", function(name) {
                        return new PaginatedState(name, {
                            text: $("Tel: 015-534-7626"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_398", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_763", $("IOM")),
                            new Choice("state_764", $("UNHCR")),
                            new Choice("state_765", $("Save the Children UK")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_763", function(name) {
                        return new PaginatedState(name, {
                            text: $("Helps stranded migrants & unaccompanied minors, protection issues, family tracing. 21 Willem Smit Street, Musina. Tel: 015-534-1314"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_764", function(name) {
                        return new PaginatedState(name, {
                            text: $("UNHCR helps with protection, humanitarian & advocacy services for refugees in Musina.  10 Irwin Street, Musina. Tel: 015-534-2381"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_765", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides support to over 14 centres in Musina that provide humanitarian aid to migrant children. No direct intake. 10 Harper Road, Ext 8, Nancefield Township, Musina. Tel: 015-534-3305"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_399", function(name) {
                    return new PaginatedState(name, {
                        text: $("SA Human Rights Commission: 1st Floor, Office 102, Library Gardens Square, cnr Francis Baard & Glover Street, Polokwane. Tel: 015 291 3500/4"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_400", function(name) {
                    return new PaginatedChoiceState(name, {
                        question: $("Select an option:"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        options_per_page: null,
                        choices: [
                            new Choice("state_766", $("LHR")),
                            new Choice("state_767", $("Musina Legal Advice Office")),
                            new Choice("state_768", $("University of Venda School of Law Clinic")),
                            new Choice("state_769", $("University of Limpopo Law Clinic")),
                            new Choice("state_770", $("Mamadi Advice Centre")),
                            new Choice("state_771", $("LAB Justice Centres")),
                            new Choice("state_772", $("Nkuzi Development Association")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_766", function(name) {
                        return new PaginatedState(name, {
                            text: $("This branch does not see clients at the office. The officers work mainly on arrest & detention monitoring at the relevant centres in Musina. No. 18 Watson Street, Musina. Tel: 072-369-8780 or 079-508-0124"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_767", function(name) {
                        return new PaginatedState(name, {
                            text: $("Paralegal assistance. 1224 Rollet Kwinda Street, Extension 2 Nancefield. Tel: 015-533-1002"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_768", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides legal assistance to everyone including migrants. Law School Building, University of Venda, Thohoyandou. Tel: 015-962-8637 / 015-962-8639"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_769", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides legal assistance to everyone including migrants. Ground Floor 0020, New R- Block, University of Limpopo, Polokwane. Tel: 015-268-3221"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_770", function(name) {
                        return new PaginatedState(name, {
                            text: $("Offers paralegal advice. Taaibosh Office (ask for the office of the Chief), GaMamadi. Tel: 083-757-1620"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_771", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides free legal assistance to people who can't afford private legal assistance. MAKHADO: Noor Gardens, cnr Krogh & Devenish Str. Tel: 015-519-1100. POLOKWANE: Pioneer Building, 52 Landros Mare Str. Tel: 015-291-2429. MODIMOLLE: Shop 8, Nyl Sake Sentrum, Nelson Mandela Street, Modimolle. Tel: 014-717-4977. THOHOYANDOU: Office 29, Law School Building, University of Venda, Thohoyandou. Tel: 015-962-6383. TZANEEN: 2nd Floor, Tzaneen Crossing Mall, cnr of Lydenburg & Skirving Street, Tzaneen. Tel: 015-307-3129"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_772", function(name) {
                        return new PaginatedState(name, {
                            text: $("Deals with the issues of abuse of farm workers. 105 Schoeman Street, Polokwane. Tel: 015-297-6972"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_401", function(name) {
                    return new PaginatedChoiceState(name, {
                        question: $("Select an option:"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        options_per_page: null,
                        choices: [
                            new Choice("state_773", $("Children Resource Centre")),
                            new Choice("state_774", $("Jesuit Refugee Services")),
                            new Choice("state_775", $("Refugee Children's Project")),
                            new Choice("state_776", $("Thohoyandou Children's Home")),
                            new Choice("state_777", $("SARCS")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_773", function(name) {
                        return new PaginatedState(name, {
                            text: $("Works with unaccompanied migrant children around Musina. Contact: Ms. Ernie Nelusha. Rollet Kwinda, Ext.2 Musina. Tel: 015-534-3413"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_774", function(name) {
                        return new PaginatedState(name, {
                            text: $("Emergency assistance incl. food & non-food items for refugees. Transport money for travel & assistance with medical emergencies. 01 Industria Street, Makhado. Tel: 015-516-3066"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_775", function(name) {
                        return new PaginatedState(name, {
                            text: $("Helps migrant children & vulnerable women access services & assists with finding shelter. 13 Wilson Street, Musina. Tel: 072-270-2001"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_776", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides shelter facilities & looks after all children without parents incl. migrant children around Thohoyandou area. Contact: Mamane (Social Worker). Thohoyandou Block, Thunda Maria Road. Tel: 015-962-1524 Cell: 078-632-4747"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_777", function(name) {
                        return new PaginatedState(name, {
                            text: $("May be able to provide emergency humanitarian assistance. Call first. 56 Klerk Street, Mokopane. Tel: 015-491-3916"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });

            self.add("state_050", function(name) {
                return new ChoiceState(name, {
                    question: $("Select an option:"),
                    choices: [
                        new Choice("state_402", $("Governmental Service Providers")),
                        new Choice("state_403", $("Statutory Bodies")),
                        new Choice("state_404", $("Legal Service Providers")),
                        new Choice("state_405", $("Counselling Services")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_402", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_778", $("Dept. of Home Affairs: Nelspruit")),
                            new Choice("state_779", $("Dept. of Home Affairs: Witbank")),
                            new Choice("state_780", $("Dept. of Social Development")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_778", function(name) {
                        return new PaginatedState(name, {
                            text: $("Cnr Henshall & Brander Streets, Nelspuit. Tel: 013-753-3131"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_779", function(name) {
                        return new PaginatedState(name, {
                            text: $("Justisie Avenue, Witbank. Tel: 013-656-7577"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_780", function(name) {
                        return new PaginatedState(name, {
                            text: $("7 Government Boulevard, Riverside Park, Ext 2, Nelspruit. Tel: 013-766-3098/3253"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_403", function(name) {
                    return new PaginatedState(name, {
                        text: $("SA Human Rights Commission: Public services on human right protection. Carltex Building, 32 Bell Street, Nelspruit. Tel: 013-752-5870"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_404", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_781", $("LAB Justice Centres")),
                            new Choice("state_782", $("Bohlabela Advice Centre")),
                            new Choice("state_783", $("Leandra Advice Centre")),
                            new Choice("state_784", $("Nkomazi")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_781", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides free legal assistance to people who can't afford private legal assistance. NELSPRUIT: Nedbank Centre, 30 Brown Street. Tel: 013-753-2154. WITBANK: Witbank Vusani House, Aras Street. Tel: 013-656-5290. ERMELO: 14 Joubert Street. Tel: 017-819-7291."),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_782", function(name) {
                        return new PaginatedState(name, {
                            text: $("Paralegal advice services. R40 Main Road, Bushbuck Ridge (behind Ansari shopping complex). Tel: 013-799-1841"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_783", function(name) {
                        return new PaginatedState(name, {
                            text: $("Paralegal advice services. 1095 Freddy Butana Nkambule Street. Tel: 017-683-1229/ 017-683-1501"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_784", function(name) {
                        return new PaginatedState(name, {
                            text: $("Paralegal advice services. Stand no 788B Schoeman's Daal Trust, Shongwe Mission, Nkomazi, Melelane. Tel: 013-781-0660, 072-437-1283 or 072-600-4804"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_405", function(name) {
                    return new PaginatedState(name, {
                        text: $("Lifeline: Limited telephone & face-to-face counselling. 8 Hope Street, Nelspruit. Tel: 013-755-2635 Crisis: 013-755-3606"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

            self.add("state_051", function(name) {
                return new ChoiceState(name, {
                    question: $("Select an option:"),
                    choices: [
                        new Choice("state_406", $("Governmental Service Providers")),
                        new Choice("state_407", $("Statutory Bodies")),
                        new Choice("state_408", $("Legal Service Providers")),
                        new Choice("state_409", $("Basic Needs Service Providers")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_406", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_785", $("Dept. of Home Affairs: Kimberley")),
                            new Choice("state_786", $("Dept. of Home Affairs: Upington")),
                            new Choice("state_787", $("Dept. of Social Development")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_785", function(name) {
                        return new PaginatedState(name, {
                            text: $("9 New Public Building, Main Road, Kimberley. Tel: 053-839-5400"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_786", function(name) {
                        return new PaginatedState(name, {
                            text: $("34/38 Mark Street, Upington. Tel: 054-332-3117"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_787", function(name) {
                        return new PaginatedState(name, {
                            text: $("Mimosa Complex, Barkley Road, Homestead, Kimberley. Tel: 053-807-5600"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_407", function(name) {
                    return new PaginatedState(name, {
                        text: $("SA Human Rights Commission: 45 Mark & Scott Road, Ancorley Building, Upington. Tel: 054-332-3993/4"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_408", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_788", $("LHR")),
                            new Choice("state_789", $("LAB Justice Centres")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_788", function(name) {
                        return new PaginatedState(name, {
                            text: $("Deals with farm workers. Facilitates contact with LHR migrants rights project. River City Centre, cnr Hill & Scott Str, Upington 054-331-2200"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_789", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides free legal services to people who can't afford private legal assistance. COLESBERG: No. 8 Campbell Str. 051-753-2280. KIMBERLEY: 21 Phakamile Mabija 053-832-2348 UPINGTON: 16 Weiderman Str. 054-337-9200 SPRINGBOK: Portion of Old Royal Food, cnr van Riebeeck & Loop Street. Tel: 027-718-2449"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_409", function(name) {
                    return new PaginatedState(name, {
                        text: $("SARCS: May be able to provide emergency humanitarian assistance. Call first. 10 Harmon Street, Kimberley. Tel: 053-832-9190"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

            self.add("state_052", function(name) {
                return new ChoiceState(name, {
                    question: $("Select an option:"),
                    choices: [
                        new Choice("state_410", $("Governmental Service Providers")),
                        new Choice("state_411", $("Statutory Bodies")),
                        new Choice("state_412", $("Legal Service Providers")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_410", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_790", $("Dept. of Home Affairs")),
                            new Choice("state_791", $("Dept. of Social Development")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_790", function(name) {
                        return new PaginatedState(name, {
                            text: $("OR Tambo 50A, Klerksdorp, Mmabatho. Tel: 018-462-6720"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_791", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provident Building, 4th Floor, University Drive, Mmabatho Tel: 018-387-0255/3497/0281/3434"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_411", function(name) {
                    return new PaginatedState(name, {
                        text: $("SA Human Rights Commission: North West Provincial Office, No. 170 Klopper Street, Rustenburg. Tel: 014-592-0614/1412"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_412", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_792", $("LAB Justice Centres")),
                            new Choice("state_793", $("Thlabolagang Advice Centre")),
                            new Choice("state_794", $("Lethabong Legal Advice Centre")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_792", function(name) {
                        return new PaginatedState(name, {
                            text: $("Provides free legal services to people who can't afford private legal assistance. KLERKSDORP: 3rd Floor, Room 333175, West End Building, Siddle St. Tel: 018-464-3022. LICHTENBURG: 25 Bantje Str. Tel: 018-632-7600. MAFIKENG: 3rd Floor, East Gallery, Mega City Complex, Mmabatho. Tel: 018-387-5111. POTCHEFSTROOM: 2nd Floor, Royal Building, James Moroka Str. Tel: 018-293-0045. RUSTENBURG: Office 21, Tlhabane Community Complex, Tlhabane. Tel: 014-565-5704. VRYBURG: 71 Vry Street, Vryburg Mall. Tel: 053-927-0095"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_793", function(name) {
                        return new PaginatedState(name, {
                            text: $("Paralegal assistance services. 1051 Van der Walt Street, Coligny. Tel: 073-664-9748"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_794", function(name) {
                        return new PaginatedState(name, {
                            text: $("Gender issues, HIV/AIDS & human rights. Paralegal services as well as referrals to legal organisations where necessary. 4411 Molapisi Street, Vula section, Lethabong. Tel: 012-270-1343 / 2353"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });

            self.add("state_053", function(name) {
                return new ChoiceState(name, {
                    question: $("Select an option:"),
                    choices: [
                        new Choice("state_413", $("Governmental Service Providers")),
                        new Choice("state_414", $("Statutory Bodies")),
                        new Choice("state_415", $("Legal Service Providers")),
                        new Choice("state_416", $("Basic Needs Service Providers")),
                        new Choice("state_417", $("Counselling Services")),
                    ],
                    next: function(choice) {
                        return choice.value;
                    }
                });
            });
                self.add("state_413", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_795", $("Dept. of Home Affairs")),
                            new Choice("state_796", $("Dept. of Social Development")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_795", function(name) {
                        return new PaginatedState(name, {
                            text: $("10988 Moshoeshoe Street, Rocklands, Bloemfontein. Tel: 051-412-7100"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_796", function(name) {
                        return new PaginatedState(name, {
                            text: $("Old Mutual Building, Maitland Street, Bloemfontein. Tel: 051-400-0302"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_414", function(name) {
                    return new PaginatedState(name, {
                        text: $("SA Human Rights Commission: Creates awareness on human rights. Protects, monitors & promotes observance of human rights. 1st Floor, 50 East Burger Street, Bloemfontein. Tel: 051-447-1130"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_415", function(name) {
                    return new PaginatedState(name, {
                        text: $("LAB Justice Centres: Provides free legal services to people who can't afford private legal assistance. BLOEMFONTEIN: 2nd Floor, St Andrews Centre, 113 St Andrew Str. Tel: 051-447-9915. KROONSTAD: 99 Murray Str. Tel: 056-216-4800. PHUTHADITHJABA: Block E, FDC Building, cnr of Motloung & Setai Str. 058-713-5000 WELKOM: Archiquant Building, 8 Heeren Str. 057-357-2847"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_416", function(name) {
                    return new ChoiceState(name, {
                        question: $("Select an option:"),
                        choices: [
                            new Choice("state_797", $("Adventist Development & Relief Agency")),
                            new Choice("state_798", $("SARCS")),
                        ],
                        next: function(choice) {
                            return choice.value;
                        }
                    });
                });
                    self.add("state_797", function(name) {
                        return new PaginatedState(name, {
                            text: $("Crisis & transportation help, basic humanitarian needs (food & non-food items). 2 Link Road, Bloemfontein. Tel: 051-430-4069"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                    self.add("state_798", function(name) {
                        return new PaginatedState(name, {
                            text: $("May be able to provide emergency humanitarian assistance. Call first. Van Der Merwe, Roodewal, Bloemfontein. Tel: 051-448-1259"),
                            characters_per_page: 160,
                            back: $('Back'),
                            more: $('More'),
                            exit: $('Exit'),
                            next: 'state_main_menu'
                        });
                    });
                self.add("state_417", function(name) {
                    return new PaginatedState(name, {
                        text: $("FAMSA: Family counselling; marriage counselling, divorce counselling, trauma counselling, play therapy. 10th Strauss Street, Universitas, Bloemfontein. Tel: 051-525-2395"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });

    });

    return {
        GoRR: GoRR
    };
}();

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoRR = go.app.GoRR;

    return {
        im: new InteractionMachine(api, new GoRR())
    };
}();
