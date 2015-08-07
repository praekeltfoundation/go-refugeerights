go.app = function() {
    var vumigo = require('vumigo_v02');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var App = vumigo.App;
    var EndState = vumigo.states.EndState;
    var Q = require('q');


    var GoRR = App.extend(function(self) {
        App.call(self, 'state_start');
        var $ = self.$;

        self.init = function() {

            // Use the metrics helper to add some metrics
            mh = new MetricsHelper(self.im);
            mh
                // Total unique users
                .add.total_unique_users('total.sms.unique_users')

                // Total opt-outs
                .add.total_state_actions(
                    {
                        state: 'state_opt_out',
                        action: 'enter'
                    },
                    'total.optouts'
                )

                // Total opt-ins
                .add.total_state_actions(
                    {
                        state: 'state_opt_in',
                        action: 'enter'
                    },
                    'total.optins'
                )

                // Total other
                .add.total_state_actions(
                    {
                        state: 'state_default',
                        action: 'enter'
                    },
                    'total.other_sms'
                );

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
                    return self.states.create("state_default_enter");
            }
        });


    // OPTOUT STATES
        self.states.add('state_opt_out_enter', function(name) {
            return go.utils
                .opt_out(self.im, self.contact)
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
                .opt_in(self.im, self.contact)
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

        self.states.add('state_default_enter', function(name) {
            if (self.contact.extra.last_report_id) {
                return go.utils
                    .nightingale_post_message(self.im, self.contact, self.im.msg.content)
                    .then(function() {
                        return Q.all([
                            self.im.metrics.fire.inc(["total", "reportresponse", "last"].join('.')),
                            self.im.metrics.fire.inc(["total", "reportresponse", "sum"].join('.'), 1)
                        ]);
                    })
                    .then(function() {
                        return self.states.create('state_default');
                    });
            } else {
                return self.states.create('state_default');
            }
        });


    // CLOSE SESSION
        self.states.add('state_default', function(name) {
            return new EndState(name, {
                text: $('Thanks for your message. We will reply if appropriate. Reply STOP to unsubscribe.'),
                next: 'state_start'
            });
        });

    });

    return {
        GoRR: GoRR
    };
}();
