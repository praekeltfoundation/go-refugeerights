go.app = function() {
    var vumigo = require('vumigo_v02');
    var Q = require('q');
    var moment = require('moment');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;


    go.utils = {
        get_clean_first_word: function(user_message) {
            return user_message
                .split(" ")[0]          // split off first word
                .replace(/\W/g, '')     // remove non letters
                .toUpperCase();         // capitalise
        },

        opt_out: function(im, contact) {
            contact.extra.optout_last_attempt = go.utils.get_today(im.config);
            return Q.all([
                im.contacts.save(contact)
            ]);
        },

        opt_in: function(im, contact) {
            contact.extra.optin_last_attempt = go.utils.get_today(im.config);
            return Q.all([
                im.contacts.save(contact)
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
    };

    var GoRRSms = App.extend(function(self) {
        App.call(self, 'state_start');
        var $ = self.$;

        self.init = function() {

            // Load self.contact
            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                   self.contact = user_contact;
                });
        };


        self.states.add('state_start', function() {
            var user_first_word = go.utils.get_clean_first_word(self.im.msg.content);
            switch (user_first_word) {
                case "STOP":
                    return self.states.create("state_opt_out_enter");
                case "BLOCK":
                    return self.states.create("state_opt_out_enter");
                case "START":
                    return self.states.create("state_opt_in_enter");
                default:
                    return self.states.create("state_unrecognised");
            }
        });


    // OPTOUT STATES
        self.states.add('state_opt_out_enter', function(name) {
            return go.utils
                .opt_out(self.im, self.contact)  // TODO
                .then(function() {
                    return self.states.create('state_opt_out');
                });
        });

        self.states.add('state_opt_out', function(name) {
            return new EndState(name, {
                text: $('Thank you. You will no longer receive messages from us. Reply START to opt back in.'),
                next: 'state_start'
            });
        });


    // OPTIN STATES
        self.states.add('state_opt_in_enter', function(name) {
            return go.utils
                .opt_in(self.im, self.contact)  // TODO
                .then(function() {
                    return self.states.create('state_opt_in');
                });
        });

        self.states.add('state_opt_in', function(name) {
            return new EndState(name, {
                text: $('Thank you. You will now receive messages from us again. Reply STOP to unsubscribe.'),
                next: 'state_start'
            });
        });


    // UNRECOGNISED
        self.states.add('state_unrecognised', function(name) {
            return new EndState(name, {
                text: $('We do not recognise the message you sent us. Reply STOP to unsubscribe.'),
                next: 'state_start'
            });
        });

    });

    return {
        GoRRSms: GoRRSms
    };
}();
