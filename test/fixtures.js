module.exports = function() {
return [

    // 01 Optout 064001
        // 01a Get subscriptions
        {
            'request': {
                'method': 'GET',
                'params': {
                    'to_addr': '+064001'
                },
                'headers': {
                    'Authorization': ['Basic ' + new Buffer('test:test').toString('base64')],
                    'Content-Type': ['application/json']
                },
                'url': 'http://fixture/api/v1/subscription/',
            },
            'response': {
                "code": 200,
                "meta": {
                    "limit": 20,
                    "next": null,
                    "offset": 0,
                    "previous": null,
                    "total_count": 2
                },
                "data": {
                    "objects": [
                        {
                            "url": "http://127.0.0.1:8000/subscription/subscription/1/",
                            "active": true,
                            "completed": false,
                            "contact_key": "e5b0888cdb4347158ea5cd2f2147d28f",
                            "created_at": "2014-08-05T11:22:34.838969",
                            "id": 1,
                            "lang": "en",
                            "messageset_id": 1,
                            "next_sequence_number": 1,
                            "process_status": 0,
                            "schedule": 1,
                            "to_addr": "+064001",
                            "updated_at": "2014-08-05T11:22:34.838996",
                        },
                        {
                            "url": "http://127.0.0.1:8000/subscription/subscription/2/",
                            "active": true,
                            "completed": false,
                            "contact_key": "e5b0888cdb4347158ea5cd2f2147d28f",
                            "created_at": "2014-08-05T11:31:50.908974",
                            "id": 2,
                            "lang": "af",
                            "messageset_id": 1,
                            "next_sequence_number": 1,
                            "process_status": 0,
                            "schedule": 1,
                            "to_addr": "+064001",
                            "updated_at": "2014-08-05T11:31:50.909025",
                        }
                    ]
                }
            }
        },
        // 01b Patch subscriptions
        {
            'request': {
                'method': 'PATCH',
                'headers': {
                    'Authorization': ['Basic ' + new Buffer('test:test').toString('base64')],
                    'Content-Type': ['application/json']
                },
                'url': 'http://fixture/api/v1/subscription/',
                "data": {
                    "objects": [
                        {
                            "url": "http://127.0.0.1:8000/subscription/subscription/1/",
                            "active": false,
                            "completed": false,
                            "contact_key": "e5b0888cdb4347158ea5cd2f2147d28f",
                            "created_at": "2014-08-05T11:22:34.838969",
                            "id": 1,
                            "lang": "en",
                            "messageset_id": 1,
                            "next_sequence_number": 1,
                            "process_status": 0,
                            "schedule": 1,
                            "to_addr": "+064001",
                            "updated_at": "2014-08-05T11:22:34.838996",
                        },
                        {
                            "url": "http://127.0.0.1:8000/subscription/subscription/2/",
                            "active": false,
                            "completed": false,
                            "contact_key": "e5b0888cdb4347158ea5cd2f2147d28f",
                            "created_at": "2014-08-05T11:31:50.908974",
                            "id": 2,
                            "lang": "af",
                            "messageset_id": 1,
                            "next_sequence_number": 1,
                            "process_status": 0,
                            "schedule": 1,
                            "to_addr": "+064001",
                            "updated_at": "2014-08-05T11:31:50.909025",
                        }
                    ]
                }
            },
            'response': {
                "code": 200,
                "data": {
                    "success": "true"
                }
            }
        },

    // 02 Subscription
        // Vumi Subscription to messages for: 082111
        {
            "request": {
                "method": "POST",
                'headers': {
                    'Authorization': ['ApiKey test_user:test_key'],
                    'Content-Type': ['application/json']
                },
                "url": 'http://127.0.0.1:8000/subscription/subscription/',
                "data": {
                    "contact_key": "contact_key",
                    "to_addr": "+082111",
                    "lang": "fr",
                    "messageset_id": 1,
                    "schedule": 1,
                }
            },
            "response": {
                "code": 201,
            }
        },

    // 03 Location finding
        // POST user data 064001
        {
            "request": {
                "method": "POST",
                "url": "http://location_fixture/poifinder/requestlookup/",
                "data": {
                    "search": {
                        "lawyer": "true",
                        "police": "true"
                    },
                    "response": {
                        "type": "USSD",
                        "to_addr": "+064001",
                        "template": "Nearby services: {{ results }}."
                    },
                    "location": {
                        "point": {
                            "type": "Point",
                            "coordinates": [3.1415, 2.7182]
                        }
                    }
                }
            },
            "response": {
                "data": {
                    "id": 1,
                    "url": "http://location_fixture/poifinder/requestlookup/1/",
                    "search": {
                        "lawyer": "true",
                        "police": "true"
                    },
                    "response": {
                        "type": "USSD",
                        "to_addr": "+064001",
                        "template": "Nearby services: {{ results }}.",
                        "results": []
                    },
                    "location": {
                        "point": {
                            "type": "Point",
                            "coordinates": [3.1415, 2.7182]
                        }
                    }
                }
            }
        },

        // GET location data 064001 - locations available
        {
            "request": {
                "method": "GET",
                "url": "http://location_fixture/poifinder/requestlookup/1/"
            },
            "response": {
                "data": {
                    "id": 1,
                    "url": "http://location_fixture/poifinder/requestlookup/1/",
                    "search": {
                        "lawyer": "true",
                        "police": "true"
                    },
                    "response": {
                        "type": "USSD",
                        "to_addr": "+064001",
                        "template": "Nearby services: {{ results }}.",
                        // TODO update 'results' after setting up API
                        "results": ["Mowbray Police station", "Turkmenistan Police station"]
                    },
                    "location": {
                        "id": 1,
                        "point": {
                            "type": "Point",
                            "coordinates": [3.1415, 2.7182]
                        }
                    }
                }
            }
        },

        // POST user data 064003
        {
            "request": {
                "method": "POST",
                "url": "http://location_fixture/poifinder/requestlookup/",
                "data": {
                    "search": {
                        "lawyer": "true",
                        "police": "true"
                    },
                    "response": {
                        "type": "USSD",
                        "to_addr": "+064003",
                        "template": "Nearby services: {{ results }}."
                    },
                    "location": {
                        "point": {
                            "type": "Point",
                            "coordinates": [3.1415, 2.7182]
                        }
                    }
                }
            },
            "response": {
                "data": {
                    "id": 3,
                    "url": "http://location_fixture/poifinder/requestlookup/3/",
                    "search": {
                        "lawyer": "true",
                        "police": "true"
                    },
                    "response": {
                        "type": "USSD",
                        "to_addr": "+064003",
                        "template": "Nearby services: {{ results }}.",
                        "results": []
                    },
                    "location": {
                        "point": {
                            "type": "Point",
                            "coordinates": [3.1415, 2.7182]
                        }
                    }
                }
            }
        },

        // GET location data - locations NOT available
        {
            "request": {
                "method": "GET",
                "url": "http://location_fixture/poifinder/requestlookup/3/"
            },
            "response": {
                "data": {
                    "id": 3,
                    "url": "http://location_fixture/poifinder/requestlookup/3/",
                    "search": {
                        "lawyer": "true",
                        "police": "true"
                    },
                    "response": {
                        "type": "USSD",
                        "to_addr": "+064003",
                        "template": "Nearby services: {{ results }}.",
                        "results": []
                    },
                    "location": {
                        "point": {
                            "type": "Point",
                            "coordinates": [3.1415, 2.7182]
                        }
                    }
                }
            }
        }


];
};
