// WARNING: This is a generated file.
//          If you edit it you will be sad.
//          Edit src/app.js instead.

var go = {};
go;

go.app = function() {
    var vumigo = require('vumigo_v02');
    var MetricsHelper = require('go-jsbox-metrics-helper');
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var EndState = vumigo.states.EndState;

    var GoApp = App.extend(function(self) {
        App.call(self, 'state_start');
        var $ = self.$;

        self.init = function() {

            // Use the metrics helper to add some metrics
            mh = new MetricsHelper(self.im);
            mh
                // Total unique users
                .add.total_unique_users('total.unique_users')

                // Total times reached state_end
                .add.total_state_actions(
                    {
                        state: 'state_end',
                        action: 'enter'
                    },
                    'total.reached_state_end'
                );

            // Load self.contact
            return self.im.contacts
                .for_user()
                .then(function(user_contact) {
                   self.contact = user_contact;
                });
        };

        self.states.add('state_start', function(name) {
            return new ChoiceState(name, {
                question: $('Hi there! What do you want to do?'),

                choices: [
                    new Choice('state_start', $('Show this menu again')),
                    new Choice('state_end', $('Exit'))],

                next: function(choice) {
                    return choice.value;
                }
            });
        });

        self.states.add('state_end', function(name) {
            return new EndState(name, {
                text: $('Thanks, cheers!'),
                next: 'state_start'
            });
        });
    });

    return {
        GoApp: GoApp
    };
}();
go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoApp = go.app.GoApp;

    return {
        im: new InteractionMachine(api, new GoApp())
    };
}();
