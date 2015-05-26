// WARNING: This is a generated file.
//          If you edit it you will be sad.
//          Edit src/app.js instead.

var go = {};
go;

var Q = require('q');
var moment = require('moment');
var vumigo = require('vumigo_v02');
var JsonApi = vumigo.http.api.JsonApi;

// Shared utils lib
go.utils = {

    timed_out: function(im) {
        var no_redirects = ['state_language', 'state_migrant_main', 'state_refugee_main',
                            'state_locate_exit'];
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
            'state_language',
            'state_country',
            'state_status',
            'state_who_refugee',
            'state_who_migrant',
            'state_refugee_rights_info',
            'state_migrant_rights_info'
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
                template: im.config.template  // used for SMS only
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
        return http.get(contact.extra.poi_url)
        .then(function(response) {
            return response.data.response.results;
        });
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

    "commas": "commas"
};

// Find and replace this character: ’

go.app = function() {
    var vumigo = require('vumigo_v02');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var Q = require('q');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var PaginatedChoiceState = vumigo.states.PaginatedChoiceState;
    var PaginatedState = vumigo.states.PaginatedState;
    var EndState = vumigo.states.EndState;
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
                question: $('Would you like to continue where you left off?'),
                choices: [
                    new Choice('continue', $('Yes, continue')),
                    new Choice('restart', $('No, restart'))
                ],

                next: function(choice) {
                    return go.utils
                        .track_redials(self.contact, self.im, choice.value)
                        .then(function() {
                            if (choice.value === 'restart') {
                                return 'state_start';
                            } else {
                                return creator_opts.name;
                            }
                        });
                }
            });
        });


    // START STATE

        // delegator 01
        self.add('state_start', function(name) {
            return go.utils
                .set_language(self.im, self.contact)
                .then(function() {
                    if (self.contact.extra.status === 'refugee') {
                        return self.states.create('state_refugee_main');
                    } else if (self.contact.extra.status === 'migrant') {
                        return self.states.create('state_migrant_main');
                    } else {
                        return self.states.create('state_language');
                    }
                });
        });


    // REGISTRATION STATES

        // 001
        self.add('state_language', function(name) {
            return new ChoiceState(name, {
                question: $('Welcome! Find info about migrants, asylum, refugees & support services. Please choose your language:'),
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
                            return 'state_country';
                        });
                }
            });
        });

        // 002
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
                        return 'state_status';
                    });
                }
            });
        });

        // 003
        self.add('state_status', function(name) {
            return new ChoiceState(name, {
                question: $('Are you a refugee or migrant?'),
                choices: [
                    new Choice('state_who_refugee', $('Who is a refugee?')),
                    new Choice('state_who_migrant', $('Who is a migrant?')),
                    new Choice('state_refugee_rights_info', $('I am a refugee')),
                    new Choice('state_migrant_rights_info', $('I am a migrant')),
                    new Choice('state_neither', $('I am neither'))
                ],
                next: function(choice) {
                    if (choice.value === 'state_who_refugee' || choice.value === 'state_who_migrant') {
                        return choice.value;
                    } else if (choice.value === 'state_neither') {
                        self.contact.extra.status = 'neither';
                        return self.im.contacts
                            .save(self.contact)
                            .then(function() {
                                return choice.value;
                            });
                    } else {
                        var status = (choice.value === 'state_refugee_rights_info') ? 'refugee' : 'migrant';
                        return go.utils
                            .register_user(self.contact, self.im, status)
                            .then(function() {
                                return choice.value;
                            });
                    }
                }
            });
        });

        // unknown 01
        self.add('state_neither', function(name) {
            return new EndState(name, {
                text: $('Unknown 01'),
                next: 'state_language'
            });
        });

        // 004
        self.add('state_who_refugee', function(name) {
            return new PaginatedState(name, {
                text: $("If you fled from your country in fear of your life due to your race, religion, nationality, gender, political or social group. Or; if your life, safety or freedom in your home country are at risk because of violence, war & civil unrest. Or; if you are married to or depend upon a person who fled their country in fear of their life for the reasons listed. You are entitled to refugee status if you are married to a recognised refugee, even if your own claim was rejected."),
                characters_per_page: 160,
                back: $('<-'),
                more: $('->'),
                exit: $('OK'),
                next: 'state_status'
            });
        });

        // 005
        self.add('state_who_migrant', function(name) {
            return new PaginatedState(name, {
                text: $("If you have come to SA to look for a job, study, visit friends & family or run a business. You need to apply for a visa.Remember: a migrant can become a refugee should one of the reasons for refugee status takes place in their country of origin."),
                characters_per_page: 160,
                back: $('<-'),
                more: $('->'),
                exit: $('OK'),
                next: 'state_status'
            });
        });

        // 006
        self.add('state_refugee_rights_info', function(name) {
            return new PaginatedState(name, {
                text: $("Welcome! This is a step-by-step guide for foreign nationals in South Africa. Read all the Menu options to find the help you need. Choose 'Word Definitions' for an explanation of words you may not be familiar with. Choose 'Tips' for a short-cut to helpful advice at each stage of your visa process - with more detail in each Menu section. Choose 'Useful Contacts' for the phone numbers of government, private or support organisations that can help. Remember: this service might not have all the information you're looking for. If your case is complicated, consult a lawyer from LHR."),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });

        // 007
        self.add('state_migrant_rights_info', function(name) {
            return new PaginatedState(name, {
                text: $("Welcome! This is a step-by-step guide for foreign nationals in South Africa. Read all the Menu options to find the help you need. Choose 'Word Definitions' for an explanation of words you may not be familiar with. Choose 'Tips' for a short-cut to helpful advice at each stage of your visa process - with more detail in each Menu section. Choose 'Useful Contacts' for the phone numbers of government, private or support organisations that can help. Remember: this service might not have all the information you're looking for. If your case is complicated, consult a lawyer from LHR."),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });


    // MAIN MENU STATES

        // delegator 02
        self.add('state_main_menu', function(name) {
            if (self.contact.extra.status === 'refugee') {
                return self.states.create('state_refugee_main');
            } else if (self.contact.extra.status === 'migrant') {
                return self.states.create('state_migrant_main');
            }
        });

        // 010
        self.add('state_refugee_main', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('MAIN MENU'),
                characters_per_page: 160,
                options_per_page: null,
                more: $('Next'),
                back: $('Back'),
                choices: [
                    new Choice("state_020", $("Refugee definitions")),
                    new Choice("state_021", $("Asylum applications")),
                    new Choice("state_022", $("Asylum applications: children")),
                    new Choice("state_023", $("Permits")),
                    new Choice("state_024", $("Support services")),
                    new Choice("state_025", $("Right to work")),
                    new Choice("state_026", $("Health rights")),
                    new Choice("state_027", $("Education")),
                    new Choice("state_028", $("Social services")),
                    new Choice("state_029", $("Banking")),
                    new Choice("state_030", $("Tips")),
                    new Choice("state_031", $("Useful contacts")),
                    new Choice("state_032", $("Safety concerns")),
                    new Choice("state_033", $("Statelessness")),
                    new Choice("state_034", $("LGBTI rights")),
                    new Choice("state_035", $("Violence against women & children")),
                    new Choice("state_036", $("Word definitions")),
                    new Choice("state_038", $("Change settings")),
                    new Choice("state_039", $("Ts & Cs of this service")),
                    new Choice("state_040", $("About LHR")),
                ],
                next: function(choice) {
                    return go.utils
                        .fire_main_menu_metrics(self.im, 'refugee', choice.value)
                        .then(function() {
                            return choice.value;
                        });
                }
            });
        });

        // 011
        self.add('state_migrant_main', function(name) {
            return new PaginatedChoiceState(name, {
                question: $('MAIN MENU'),
                characters_per_page: 160,
                options_per_page: null,
                more: $('Next'),
                back: $('Back'),
                choices: [
                    new Choice("state_060", $("New to SA")),
                    new Choice("state_061", $("The visa application process")),
                    new Choice("state_062", $("Unaccompanied / separated children")),
                    new Choice("state_063", $("Support services")),
                    new Choice("state_064", $("Employment")),
                    new Choice("state_065", $("Healthcare")),
                    new Choice("state_066", $("Education")),
                    new Choice("state_067", $("Banking")),
                    new Choice("state_068", $("LGBTI rights")),
                    new Choice("state_069", $("Violence against women & children")),
                    new Choice("state_070", $("Safety concerns")),
                    new Choice("state_071", $("Statelessness")),
                    new Choice("state_072", $("Change settings")),
                    new Choice("state_039", $("Ts & Cs of this service")),
                    new Choice("state_036", $("Word definitions")),
                    new Choice("state_030", $("Tips")),
                    new Choice("state_031", $("Useful contacts")),
                    new Choice("state_040", $("About LHR")),
                ],
                next: function(choice) {
                    return go.utils
                        .fire_main_menu_metrics(self.im, 'migrant', choice.value)
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
            return new ChoiceState(name, {
                question: $("The system is looking up services near you. This usually takes less than a minute."),
                choices: [
                    new Choice('state_locate_get_results', $("View services"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // state_locate_stall_again
        self.add('state_locate_stall_again', function(name) {
            return new ChoiceState(name, {
                question: $("The system was still busy finding your services. Please try again now or choose Exit and dial back later."),
                choices: [
                    new Choice('state_locate_get_results', $("View services")),
                    new Choice('state_locate_exit', $("Exit"))
                ],
                next: function(choice) {
                    return choice.value;
                }
            });
        });

        // state_locate_exit
        self.add('state_locate_exit', function(name) {
            return new EndState(name, {
                text: $('Please dial back in a few minutes to see your services results'),
                next: 'state_locate_stall_again'
            });
        });


        // state_locate_get_results
        self.add('state_locate_get_results', function(name) {
            return go.utils.get_poi_results(self.im, self.contact)
            .then(function(poi_results) {
                if (poi_results.length === 0) {
                    // stall again if results are not available
                    // TODO handle search complete but no results found
                    return self.states.create('state_locate_stall_again');
                } else {
                    var opts = { poi_results: poi_results };
                    return self.states.create('state_locate_show_results', opts);
                }
            });
        });

        // state_locate_show_results
        self.add('state_locate_show_results', function(name, opts) {
            var choices = [];
            opts.poi_results.forEach(function(poi_result) {
                choices.push(new Choice('state_locate_details', poi_result));
            });

            return new ChoiceState(name, {
                question: $('Select a service for more info'),
                choices: choices,
                next: function(choice) {
                    // TODO create state that shows the selected service's details after Api has
                    // been implemented
                    return choice.value;
                }
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
                    text: $("An asylum seeker awaits a decision on his/her asylum application. A refugee’s application has been approved & given refugee status."),
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
                    text: $("If you get protection or nationality in your country of origin or in a new country; or return to settle in the country you fled. If you no longer feel threatened & take on protection of your country of origin because circumstances have changed. New circumstances means there isn’t a risk of persecution. The solutions in your country must be effective & long-lasting."),
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
                    new Choice("state_172", $("Help with interpreting")),
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
                    text: $("It’s your right to have your asylum application processed and decided upon in a fair and transparent way. It’s your right not to be deported to your country of origin while your application is awaiting a decision. It’s your right not to be prosecuted for unlawful entry or your presence in SA while your application is awaiting a decision."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_213", function(name) {
                return new PaginatedState(name, {
                    text: $("Apply for asylum as soon as possible after your entry into SA, by visiting a Refugee Reception Office (RRO). If you bump into a police or immigration officer before you’ve applied for asylum, you must say you are going to apply. If a police or immigration officer arrests or detains you, contact the LHR for legal help. TIP: The asylum process is hard. You may queue for weeks before you get help. You won’t get proof that you’ve been queueing. TIP: Until you receive a Section 22 permit, the police or immigration can arrest you. Contact LHR for legal help if you are arrested."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_214", function(name) {
                return new PaginatedState(name, {
                    text: $("There are Refugee Reception Offices (RRO) in Cape Town, Durban, Musina and Pretoria. Click ‘Next’ to find the nearest office. Cape Town (Nyanga):142 Voortrekker Road,Maitland 021-514-8414 Fax:021-514-8403 No new applications, only renewals of existing asylum seekers. Durban: 132 Moore Street. 031-362-1205 Fax: 031-362-1220. Musina: 8 Harold Street (next to the post office) 015-534-5300 Fax: 015-534-5332. Pretoria: Marabastad, corner E’skia Mphahlele & Struben Street, Pretoria West. 012-327-3515 Fax: 012-327-5782. Pretoria (TIRRO): 203 Soutter Street, Pretoria Showgrounds. 012-306-0800 or 012-306-0806 Fax: 086-579-7823"),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_215", function(name) {
                return new PaginatedState(name, {
                    text: $("The RRO sees a fixed number of people per day. Go early to make sure you get a place. Some people start queueing at 3am. Take warm clothes, food, water or money to buy food with you. Look out for notices posted at the RRO that may contain important information. Ask for advice from refugees who have gone through the process. Ask about the different queues for new arrivals, renewals & ID documents. If you have a community representative, ask if they have useful information for you from the refugee office. It is important to follow the process. Don’t ask for special treatment - it may damage your case. Remember to keep your appointments. This will reduce your waiting time - and everybody else’s. There are 5 refugee reception offices in SA. Go to the office closest to you on the day allocated to your nationality. SADC: Mon & Tue. East Africa: Wed & Sat. West Africa: Thurs. Asia & other countries: Fri. Hours: 7am - 5pm weekdays, 8am - 1pm Saturdays."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_216", function(name) {
                return new PaginatedState(name, {
                    text: $("Asylum seekers & refugees are protected by SA’s Constitution when they obey the law & accept the asylum seeker’s duties. It’s your duty to go to the RRO when you arrive in SA and truthfully explain why you want asylum. It’s your duty to obey the law. If you commit a crime in SA you will be prosecuted like any other South African. Peace is your right and duty. If you assist in armed attacks against your country, you may lose your refugee status & go to jail."),
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
            // >> state_172
                self.add("state_170", function(name) {
                    return new PaginatedState(name, {
                        text: $("Fill out the Eligibility form. Answer honestly. You will be interviewed later so your answers must be the same. Bring with you all documents that show who you are & where you come from. Copies will be taken so you keep the originals. After fingerprints are taken, a case number & file number will be given. Write down these important numbers. Man & wife must both be interviewed if applying together. Name your wife or children in another country to add them to your file. English not good? Take an interpreter with you. If you cannot, one will be arranged for another day & you’ll come back on that day. You may have to pay an interpreter. Don’t pay anyone else – no officials, no security guards. The process is free. Fight corruption. TIP: If a DHA official asks for a bribe, get his/her name. Note down the official’s physical features, the day & time it happened. TIP: There is no need to pay fees. Call the DHA’s toll-free hotline to report corruption. You will stay anonymous. 0800-601-190"),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_171", function(name) {
                    return new PaginatedState(name, {
                        text: $("You will get a Section 22 permit (Asylum-seeker’s permit) when you apply. It is proof you have applied. You are not yet a refugee. Your permit lets you work or study in SA. Sign it. Check the permit conditions or ask. Know if it’s valid for 1 month or 3. Make a copy of the permit. Always carry it with you. Keep renewing it before it expires. A decision can take months or years.TIP: If you don’t renew your Section 22 permit before it expires, you could be arrested & detained or pay a fine."),
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
                        text: $("If your application is approved, you’ll get a Section 24 permit (Refugee Status permit). Now you’re officially a refugee in SA! Your permit is valid for 2 years or sometimes 4 years. You must renew it 3 months before it expires. Go to the relevant RRO for a renewal. Refugees can apply for a refugee Identity Document (a maroon ‘ID’ or smart card) & travel documents. It may take time. Only apply for travel documents if you have a refugee identity document (ID). You must be interviewed by a UNHCR representative. If you don’t have a refugee ID but must travel out of SA for an emergency, contact a legal counselor or UNHCR Pretoria. TIP: Remember, if you use a travel document to travel back to your country, you could lose your refugee status in SA."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_174", function(name) {
                    return new PaginatedState(name, {
                        text: $("A rejected application by a RRO officer means they don’t recognise you as a refugee. You can appeal this decision at the RAB. Hand in a notice of appeal within 30 days. The reason for your rejection will affect your appeal. If you don’t want to appeal, you must document your stay in another way, or leave the country. If your application was found to be fraudulent or abusive, the Standing Committee of Refugee Affairs will automatically review it. You may give the committee a written statement on why you disagree with the decision - but you cannot appear in person. Within 14 days, submit your statement to the RRO that issued the rejection letter. Ask a LHR legal counsellor for help."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_175", function(name) {
                    return new PaginatedState(name, {
                        text: $("The Refugee Appeal Board offers asylum seekers with rejected applications a second chance to prove their claims. Within 30 days, submit an appeal request to the RRO that issued the rejection letter. Say why you disagree with the decision. The RRO will hand the case over to the Refugee Appeal Board. (You can ask LHR for help in requesting an appeal.) To get an appeal hearing date, you will be called in to the RRO to present your case & your reasons for applying for asylum. You must appear in person at the RRO to get the appeal hearing date. It cannot be given over the phone. You must get legal assistance to prepare for your appeal. Some NGOs give free legal help. See ‘Useful Contacts’ for more info. You may get a decision within 90 days of the hearing. It can take longer. Renew your asylum seeker permit while you wait."),
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
                    text: $("If a child enters SA in the care of a relative who is not a parent or grandparent, the caregiver must go to the Children’s Court. At the court, the caregiver must apply to be the child’s legal guardian - and can then apply for a foster care grant from the DHA. If accompanied by a parent, grandparent or legal guardian, a child’s asylum application is included in the adult’s documents. Refugee status is given to children or dependants when the head of the family or household’s application is approved. In countries where children are persecuted, a child’s case for asylum can be stronger than the parents’ claims. If the child’s case is stronger, then he/she should submit an independent application for asylum. A legal representative, parent or legal guardian must always go with a child asylum seeker to his/her interviews."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_177", function(name) {
                return new PaginatedState(name, {
                    text: $("A child asylum seeker is unaccompanied when there isn’t a person present whose main responsibility is to take care of the child. Children who were separated from their parents before or during the flight from their country are also ‘unaccompanied’ children."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_178", function(name) {
                return new PaginatedState(name, {
                    text: $("Children without a parent or guardian must be referred to the Dept. of Social Development. A social worker will be assigned to the child. The social worker will go to the Children’s Court. The court will confirm if the child is in need of care. The social worker will verify the child’s placement in a temporary place of safety. A report must be compiled. If the child is an asylum seeker, the social worker must work with the DHA to help the child with his/her asylum application at a RRO. The social worker must also investigate the possibility of reuniting the child with their family in their home country. Safety is important. If the unaccompanied child doesn’t have an asylum claim, a legal counsellor like LHR must be contacted. The Dept. of Social Development must ensure unaccompanied refugee & asylum children receive protection, shelter, nutrition & social services. This is important: children must be documented as soon as possible, or they risk becoming stateless."),
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
                    text: $("Lost permit? Get a statement or affidavit at the police station. Submit the statement with a copy of your permit (if you can) at the RRO. TIP: Lost permits are hard to replace. Make certified copies & give to family or keep it safe. Remember your permit’s file & case number."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_182", function(name) {
                return new PaginatedState(name, {
                    text: $("Recognised refugees may apply for  permanent residence. You must have lived in SA for 5 years in a row as a recognised refugee. Consult the Immigration Act of 2002 for more info on the requirements for a permanent residence application. It is important to get a certificate from the Standing Committee for Refugee Affairs (SCRA) saying you will remain a refugee indefinitely. To apply for a permanent residence permit, complete an application form at the SCRA. You can ask a legal counsellor like the LHR for help. Submit the SCRA certificate & the documents required by the Immigration Act, to a regional DHA office (not RRO). See ‘Useful Contacts’. TIP: Refugees don’t have to pay to submit a permanent residence application. TIP: You need a security clearance certificate from SA police - but not from your country of origin. TIP: You must get an affidavit from the police stating whether or not you have a criminal record in your country of origin."),
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
                    text: $("Some university law clinics & human rights organisations offer free legal advice to asylum seekers & refugees. The UNHCR has legal counsellors specialising in refugee law in 5 SA cities. See ‘Useful Contacts’ for more info. Legal counsellors can advise on your asylum application, or help you with an appeal if your asylum application has been rejected. Counsellors can only give you legal advice. They don’t provide accommodation or food. See Social Services for more info."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_190", function(name) {
                return new PaginatedState(name, {
                    text: $("A private practice attorney can also help you with your asylum application, appeal or SCRA review. Ordinarily you need to pay for legal services. Or, contact LHR - they may be able to help or refer you to the right organisation. The Law Society of South Africa has a list of attorneys with experience in refugee law. See ‘Useful Contacts’ for more info.TIP: Always ask about a lawyer’s fees before you accept their services. TIP: Always make sure your lawyer has the right qualifications. If you’re unsure contact the Law Society of SA on 012-366-8800."),
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
                    text: $("There are legal ways out of your arrest. It may take time. Ask to speak to a lawyer. It is your right. If arrested but you have a valid Section 22 or 24 permit, ask someone to get copies of your permit to the DHA. Sometimes the RRO must first confirm your permit before you can be released. The DHA may detain you while verifying your permit. You cannot be sent back to your country before a decision on your asylum application or appeal has been made. If you didn’t apply for asylum before your arrest, tell the officer you will still apply. Give reasons why you have not yet. If you break the law, your asylum application may be turned down & you may be sent home - before or after serving a sentence. Remember: You have the right to get legal representation if you are arrested. TIP: If you go to a magistrate’s court, you can ask for ‘legal aid’. You will be able to speak to a lawyer for free."),
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
                    text: $("Every refugee or asylum seeker with a valid permit has the right to work in SA. You can be employed or run your own business. Refugees & asylum seekers can also be formally employed. You don’t need an extra work visa."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            // >> state_112
            // >> state_113
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
                        text: $("Asylum seekers and refugees can work with their permits and don’t need an extra work visa."),
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
                        text: $("The South African Nursing Council (SANC) processes applications for nurses with qualifications from foreign countries. Refugees with foreign qualifications must register with SANC. You need to submit a set of required documents. Required documents: application letter, CV, letter of support to seek employment in South Africa from Dept. of Health FWMP. And; English Language Proficiency certificate (only if your nursing education wasn’t in English) with an average IELTS score of 6. And; SAQA evaluation certificates of Foreign Educational Certificate & professional certificates & your certified refugee permit. If you are already registered in your home country, you must get a SANC affidavit. Your qualification & experience will be evaluated. If you meet the minimum SANC requirements, you must write a SANC entry examination based on your area of competence. If your application is successful, you must submit an application registration form & pay a registration fee."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_234", function(name) {
                    return new PaginatedState(name, {
                        text: $("If you are a qualified medical doctor with refugee status you can apply to register as a doctor in SA. The Department of Health (DOH) employs foreign doctors with the right qualifications & experience in government hospitals. To register, contact the Department of Health’s Foreign Workforce Management Programme (FWMP) on 012 312 0467. To register, you need a job offer from a government hospital or health department. Apply for a formal endorsement from FWMP. When you have a job offer & endorsement, apply to register with the Health Professions Council of SA (HPCSA) 012-338-9350."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_235", function(name) {
                    return new PaginatedState(name, {
                        text: $("If you are a public school teacher you need to check your international teaching qualification with the SA Qualifications Authority (SAQA). The SAQA evaluation doesn’t guarantee a job. Also register with SA Council for Educators (SACE). Go to www.sace.org.za for more info."),
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
                    text: $("You have the right to basic health & reproductive health care services in SA. You cannot be refused emergency medical treatment. Hospital workers don’t always know the rights of refugees & asylum seekers with valid permits. You can contact Lawyers for Human Rights when you’ve a problem accessing public health services."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_237", function(name) {
                return new PaginatedState(name, {
                    text: $("Refugees & asylum seekers pay the same fees as SA nationals. Take your documents with to prove you’re an asylum seeker or refugee. Your fee is determined by a means test. The means test will determine how much your fees will be subsidised. There are 3 income groups: H1, H2 and H3. If you don’t have the right documents, you will be placed in the H3 group. H1: you earn less than R36 000 a year. H2: you earn less than R72 000 a year. H3: you earn more than R72 000 a year. Take the following with to hospital: ID, appointment card, payslip or proof of salary & proof of address. TIP: Feeling ill? Go to a clinic close to your house first. You will get a letter for a hospital if they can’t help you. TIP: If there’s an emergency, go straight to hospital."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_238", function(name) {
                return new PaginatedState(name, {
                    text: $("Clinics provide care for adults & children. Most of the time you will not have to pay to see the doctor or get treatment. Go to the clinic closest to your home. Make an appointment first. If there’s an emergency, just go. Wait for a doctor. Take your valid Section 22 or 24 permit with you. If you haven’t received it yet, ask an NGO for a letter. See ‘Useful Contacts’. After you’ve seen the doctor, the clinic will give you medicine if you need it. You don’t have to pay for the medicine. If you want to go to the hospital, you need a letter from the clinic first. If there’s an emergency, go straight to the hospital. Can’t pay the public hospital fees? Get an affidavit from the police that states why you can’t pay. You can also contact a NGO in the contact list if you can’t pay your fees. They may ask the hospital to drop the fees. This is important: if you go to a private doctor or private hospital you will have to pay all the fees yourself."),
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
                    text: $("A creche is a preschool day-care centre for children from 1-6 years old. You have to pay a school fee. Can’t pay? Try to negotiate with the creche or offer to work in exchange for a cheaper fee. All children in SA must go to school, including refugees & asylum seekers. It’s the law. Primary school is for children from 7-13 years old. Secondary school is for children from 13 to 19 years old. Secondary schools can be academic or technical. TIP: Age groups in schools are flexible. A child may be older than their school friends due to unplanned situations. TIP: In most SA government schools a student cannot be more than 2 years older than their grade’s age group."),
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
                        text: $("Asylum & refugee children have a right to primary education. They are entitled to access the same schooling as SA children. Register for primary school at the school closest to your house. English not good? Take a friend who can help with you. Schools get full quickly. You need to apply early. Try to apply from July for entry into the school for the following year. If the school closest to your house is full, the school must show you to another school that can help you. If you struggle to register, go back to the school close to your house. They must refer you to the Dept. of Education for help. If the school refuses admission, ask for a letter on the school letterhead signed by the principal. Take it to the Dept. of Education. Still can’t find a school for your child? Contact a social service provider for education or LHR. Go to the contact list for more info."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_242", function(name) {
                    return new PaginatedState(name, {
                        text: $("The parent or legal guardian must register the child. Give your family’s contact details: physical & postal address & telephone numbers. Provide the school with certified copies of the child and/or parent’s permit & the child’s inoculation certificate. If you don’t have an inoculation certificate you must get one within 3 months from the local municipal clinic."),
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
                    text: $("You need to pay an international registration & local tuition fee. Have your academic records evaluated & certified by SAQA. Submit the completed SAQA  form with certified copies of your academic records. The process can take up to 3 months. You must be proficient in English to register. Prove your proficiency by taking one of the following tests: TOEFL, IELTS, PTEEP. Information on scholarships & funding is available online or at the university/technikon’s information desk. UNHCR offers a Dafi Scholarship for refugees not older than 28 & who successfully completed their secondary education. The Dafi Scholarship doesn’t apply to postgraduate studies. For more info & requirements, see ‘Useful contacts’."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_245", function(name) {
                return new PaginatedState(name, {
                    text: $("Some NGOs & refugee communities offer adult education to refugees & asylum seekers. Most adult education programmes are free. Some training centres offer English language courses. Self-help programmes & skills training can be important for job seekers. Adult education programmes also encourage social integration in SA. See ‘Useful Contacts’ for more info."),
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
                    text: $("You must look after your own social & economic needs. The SA Government, UNHCR & NGO’s can only help in exceptional cases. The UNHCR’s role is limited in SA, with no camp-based situations. They can’t provide for all the needs of asylum seekers. The UNHCR & NGOs give limited assistance in cities with an RRO. Assistance is only for the most vulnerable asylum seekers. Vulnerable asylum seekers include mothers with children who have been in SA for less than 2 months. Or; people with very serious illnesses & disabilities & newly arrived single men with special needs. Assistance can include food & basic accommodation for up to 3 months. Most refugee communities have little material assistance to offer, but can give support to newly arrived asylum seekers. Asylum seekers and refugees can access public services like health care & education."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_247", function(name) {
                return new PaginatedState(name, {
                    text: $("You have the right to food, water & housing. Some organisations can help vulnerable asylum seekers & refugees with this. Remember: Help is limited and for a short time only. You will be expected to support yourself soon afterwards. Some churches and religious centres run soup kitchens or provide help to asylum seekers and refugees. See ‘Useful Contacts’  for more info on these churches and religious centres."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_248", function(name) {
                return new PaginatedState(name, {
                    text: $("Some NGOs might help you find short-term solutions, like a shelter or place for the homeless. See ‘Useful Contacts’ for info. Ask other refugees & asylum seekers for info on accommodation. Check local newspapers for ads. Estate agents can charge a fee. Rent is paid at the beginning of the month. You might have to pay a deposit (a month’s rent) before you can move in. If possible, sign a contract with your landlord. Ask him/her what they expect of you as a tenant."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_249", function(name) {
                return new PaginatedState(name, {
                    text: $("The law also protects refugees & asylum seekers from unlawful evictions. The landlord must have a court order before he can evict you. Remember: only a court can force you to leave. You must know when & where the court hearing will take place before the court order is given to you. The landlord cannot threaten you or use force to remove you from the property. Contact the Rental Housing Tribunal 011-630-5035 or 0800-046-873 if there’s a dispute or if you feel you’ve been unfairly treated."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_250", function(name) {
                return new PaginatedState(name, {
                    text: $("Recognised refugees can get social assistance under certain circumstances. This doesn’t apply to asylum seekers."),
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
                        text: $("This is a temporary or permanent monthly grant for recognised refugees who can’t work due to a mental or physical disability. Recognised refugees who are foster parents of a disabled child under 18, can apply for a care dependency grant."),
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
                    text: $("It may be difficult to open a bank account in SA. Most banks want to see a green SA ID before they open a bank account. Banks don’t always know the rights of refugees & asylum seekers with valid permits. They may refuse to open bank accounts. Asylum seekers can use their temporary asylum seeker permit as identification. Refugees can use their refugee permit or refugee ID. FNB, Standard Bank & Nedbank accept asylum seekers & refugees. Ask other refugees which bank in your area is refugee-friendly."),
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
                    text: $("Savings & credit co-operatives often open up bank accounts for refugees. They operate as credit unions. Credit unions are groups of people who save together & lend money to each other. They don’t operate as ordinary banks."),
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
                    text: $("The asylum process is hard. You may queue for weeks before you get help. You won’t get proof that you’ve been queueing. Until you receive a Section 22 permit, the police or immigration can arrest you. Contact LHR for legal help if you are arrested. If a DHA official asks for a bribe, get his/her name. Make a note of the official’s physical features, the day & time this happened. There is no need to pay any fees. Call the DHA’s toll-free hotline to report corruption. You will remain anonymous. 0800-601-190 If you don’t renew your Section 22 (asylum seeker) permit before it expires, you could be arrested & detained or pay a fine. Remember, if you use the travel document to travel back to your country, you could lose your refugee status in SA."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_258", function(name) {
                return new PaginatedState(name, {
                    text: $("Always ask if there is a separate renewal queue for permits. Remember to take all original documents with you when renewing your permit. You have the right to question the fine if you think it’s wrongly given to you. Speak to a lawyer if you are worried about it. Permits aren’t renewed automatically. Renew your permit before it expires. You can get arrested if you have an expired permit. Lost permits are hard to replace. Make certified copies & give to family or keep it safe. Remember your permit’s file & case number. Refugees don’t have to pay to submit a permanent residence application. You need a security clearance certificate from SA police. You don’t need a security clearance certificate from your country of origin. You must get an affidavit from the police declaring whether you have a criminal record in your country of origin."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_259", function(name) {
                return new PaginatedState(name, {
                    text: $("Always ask about a lawyer’s fees before you accept their services. Always ensure your lawyer has the right qualifications. If you’re unsure contact the Law Society of SA on 012-366-8800. Always carry your valid permit or certified copy with you. This is proof that you are allowed to stay in SA. Renew your permit on time! If you go to a magistrate’s court, you can ask for ‘legal aid’. You will be able to speak to a lawyer for free."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_260", function(name) {
                return new PaginatedState(name, {
                    text: $("It’s important to obey all the by-laws. If you don’t follow the by-laws, you may lose your goods or go to jail."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_261", function(name) {
                return new PaginatedState(name, {
                    text: $("Feeling ill? Go to a clinic close to your house first. You will get a letter for a hospital if they can’t help you. If there’s an emergency, go straight to hospital. You cannot get HIV through casual contact, like working together, kissing a friend, sharing the same bathroom or kitchen. Contact LoveLife 0800 121 900, Aids Helpline 0800 01 23 22, Aids Hotline 0800 11 06 05 for more info or help."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_262", function(name) {
                return new PaginatedState(name, {
                    text: $("Age groups in schools are flexible. A child may be older than their school friends due to unplanned situations. In most SA government schools a student cannot be more than 2 years older than their grade’s age group. You shouldn’t pay a registration fee at the school. The public school can’t ask your child to leave if you can’t pay."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_263", function(name) {
                return new PaginatedState(name, {
                    text: $("Resettlement is possible in exceptional cases, but not an option for many refugees with SA refugee status. It can take more than a year. You’ll lose your refugee status when you leave SA through voluntary repatriation. It must be safe for you to return to your country. Family reunification applications must be made to the DHA at the RRO. Only the DHA considers family reunification for refugees."),
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
                    text: $("Xenophobia is an irrational hatred towards foreigners or an unreasonable fear or hatred of the unfamiliar persons. If you are a victim of xenophobic attacks, you must report it to the police. Go to the police station closest to your home. You must explain in detail what happened. The police will open a case. You will get a case number. Keep it safe! If you’ve lost your document, get an affidavit from the police that explains your situation. Go to the RRO for a new permit."),
                    characters_per_page: 160,
                    back: $('Back'),
                    more: $('More'),
                    exit: $('Exit'),
                    next: 'state_main_menu'
                });
            });
            self.add("state_265", function(name) {
                return new PaginatedState(name, {
                    text: $("Sometimes the UNHCR helps with the movement of refugees from one place to another. This is called relocation. There are 4 relocation options: resettlement, internal relocation, voluntary repatriation & family reunification. Relocation is not part of the asylum process. It only happens when the UNHCR identifies the need for protection. Only recognised refugees will be considered for these relocation options. Asylum seekers will be considered in exceptional cases. A separate status interview will be carried out by the UNHCR. Remember: the UNHCR’s outcome can differ from the DHA’s process."),
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
                        text: $("Exceptional situations where refugees who are of concern to the UNHCR, are refused entry to SA. This also includes refugees who are of concern to the UNHCR who’ve had their asylum applications rejected. Situations where the SA government cannot offer suitable protection to refugees faced with a direct threat to life & safety. When SA medical & psychological services cannot meet the needs of survivors of violence & torture. When SA cannot provide the necessary medical care to refugees with specific medical & disability needs. When SA cannot provide the necessary protection to address the needs of women at risk & elderly refugees. Unaccompanied children may be resettled if the child is considered especially vulnerable."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
                self.add("state_356", function(name) {
                    return new PaginatedState(name, {
                        text: $("Ask a legal counsellor for help if you fall within one of the 4 relocation categories. You can also contact the UNHCR for advice. Go to the UNHCR on a Monday to make an appointment. Their consultation days are on Tuesdays & Thursdays. If the UNHCR can’t find a way to solve your problems in SA, they may consider resettlement options. A final decision will be made based on the information you provided. If the decision is negative, they will notify you in writing. If the UNHCR decides that resettlement is necessary, they will ask a third country to review your application. If the third country is satisfied with your case, an entry visa will be prepared. You must go for a medical examination as part of your resettlement application. You may be interviewed again. The IOM will prepare the travel documents for refugees to be resettled. The whole process can take 1 - 2 years."),
                        characters_per_page: 160,
                        back: $('Back'),
                        more: $('More'),
                        exit: $('Exit'),
                        next: 'state_main_menu'
                    });
                });
            self.add("state_268", function(name) {
                return new PaginatedState(name, {
                    text: $("Internal relocation is the movement of a refugee/asylum seeker & his/her nuclear family (husband/wife & children) within SA. Internal relocation is for protection purposes. In exceptional situations you may be relocated to get better access to the UNHCR. Internal relocation procedures are the same as resettlement procedures. You can’t apply if you simply have transportation needs in SA. If the UNHCR is convinced you need internal relocation, they will find safer locations within SA where you can live. Temporary accommodation & necessary services can be provided. The UNHCR will also arrange transport."),
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
                    text: $("Sometimes family members need to be traced before they can be reunited. The SARCS & ICRC help to restore these family links. The Red Cross works with the UNHCR to reunite families. They assist with child protection during the reunification process. The Red Cross can help to reunite unaccompanied & separated children, as well as reuniting the elderly or vulnerable. The Red Cross message system helps to restore contact between family members if the identity & full address of both parties is known. Always give as much info as possible: the missing person’s identity, reason for separation and last place of contact. Consult the Red Cross and the Red Crescent if the missing person has been resettled. The success of finding a missing person depends on information given and the accessibility of the area they occupy. The danger posed by armed conflicts or natural disasters, may delay the tracing of a missing person."),
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
                text: $("SA’s Constitution protects the rights of Lesbian, Gay, Bisexual & Transgender individuals (LGBTI). LGBTI victims of unjust treatment must go to the police. LGBTI victims of hate speech may lay a complaint with the SAHRC or approach the Equality Court for relief. The Refugee act states that the LGBTI group can get protection if they are persecuted for their sexual orientation. Don’t be afraid to disclose your sexual orientation when applying for asylum. The RRO must treat your claim with confidentiality. Contact LHR or another legal organisation if your claim isn’t treated with sensitivity & respect. See Useful Contacts for more info."),
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
                    text: $("Life-threatening violation of human rights because of a person’s race, religion, nationality, political opinion or social group."),
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
                    text: $("Southern African Women’s Institute for Migration Affairs"),
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

        // TODO update this with migrant copy
        self.add("state_038", function(name) {
            return new PaginatedState(name, {
                text: $("Your new settings have been saved. Please dial back for it to take effect. Brought to you by Lawyers for Humans Rights www.lhr.org.za"),
                characters_per_page: 160,
                back: $('Back'),
                more: $('More'),
                exit: $('Exit'),
                next: 'state_main_menu'
            });
        });

        self.add("state_039", function(name) {
            return new PaginatedState(name, {
                text: $("This mobile info system is only a guide. It isn’t the same as complete legal advice. Users should contact a law clinic for complex issues. LHR will not be liable for any loss from actions taken as a result of this service. Your registration & personal details are confidential & safe. It will only be used when you’ve made a follow up request or report to LHR. The registration & the actual mobile application service is free. You will only be charged according to USSD data fees per their usage. LHR reserves the right to terminate usage of this service should there be deemed an abuse of the service."),
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
                    text: $("A person who doesn’t have a valid visa or residence permit needed to be in SA legally."),
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
