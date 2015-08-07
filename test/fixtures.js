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
                    'Authorization': ['Token test_key']
                },
                'url': 'http://127.0.0.1:8000/subscription/subscription/',
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
                "data": [
                    {
                        "url": "http://127.0.0.1:8000/subscription/subscription/1/",
                        "active": false,
                        "completed": false,
                        "contact_key": "contact_key_064001",
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
                        "contact_key": "contact_key_064001",
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
        // 01b Patch subscriptions
        {
            'request': {
                'method': 'PATCH',
                'headers': {
                    'Authorization': ['Token test_key']
                },
                'url': 'http://127.0.0.1:8000/subscription/subscription/2/',
                "data": {
                    "url": "http://127.0.0.1:8000/subscription/subscription/2/",
                    "active": false,
                    "completed": false,
                    "contact_key": "contact_key_064001",
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
                'headers': ['Token test_key'],
                "url": 'http://127.0.0.1:8000/subscription/subscription/',
                "data": {
                    "contact_key": "contact_key_082111",
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
                        "template": "Nearby services: {{ results }}.",
                        "results": "",
                        "results_detailed": '[]'
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
                        "results": "",
                        "results_detailed": '[]'
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
                        "results": "Mowbray Police station (012 001 0002) AND Turkmenistan Police station",
                        "results_detailed": '[[1, "Mowbray Police (012 001 0002)"], [2, "Turkmenistan Police"]]'
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
                        "template": "Nearby services: {{ results }}.",
                        "results": "",
                        "results_detailed": '[]'
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
                        "results": "",
                        "results_detailed": '[]'
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
                        "results": "",
                        "results_detailed": '[]'
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

    // 04 Language change 064002
        // 04a Get subscriptions
        {
            'request': {
                'method': 'GET',
                'params': {
                    'to_addr': '+064002'
                },
                'headers': {
                    'Authorization': ['Token test_key']
                },
                'url': 'http://127.0.0.1:8000/subscription/subscription/',
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
                "data": [
                    {
                        "url": "http://127.0.0.1:8000/subscription/subscription/1/",
                        "active": false,
                        "completed": false,
                        "contact_key": "contact_key_064001",
                        "created_at": "2014-08-05T11:22:34.838969",
                        "id": 1,
                        "lang": "fr",
                        "messageset_id": 1,
                        "next_sequence_number": 1,
                        "process_status": 0,
                        "schedule": 1,
                        "to_addr": "+064002",
                        "updated_at": "2014-08-05T11:22:34.838996",
                    },
                    {
                        "url": "http://127.0.0.1:8000/subscription/subscription/2/",
                        "active": true,
                        "completed": false,
                        "contact_key": "contact_key_064001",
                        "created_at": "2014-08-05T11:31:50.908974",
                        "id": 2,
                        "lang": "fr",
                        "messageset_id": 1,
                        "next_sequence_number": 1,
                        "process_status": 0,
                        "schedule": 1,
                        "to_addr": "+064002",
                        "updated_at": "2014-08-05T11:31:50.909025",
                    },
                    {
                        "url": "http://127.0.0.1:8000/subscription/subscription/3/",
                        "active": true,
                        "completed": false,
                        "contact_key": "contact_key_064001",
                        "created_at": "2014-08-05T11:31:50.908974",
                        "id": 3,
                        "lang": "fr",
                        "messageset_id": 1,
                        "next_sequence_number": 1,
                        "process_status": 0,
                        "schedule": 1,
                        "to_addr": "+064002",
                        "updated_at": "2014-08-05T11:31:50.909025",
                    }
                ]
            }
        },
        // 04b Patch subscriptions
        {
            'request': {
                'method': 'PATCH',
                'headers': {
                    'Authorization': ['Token test_key']
                },
                'url': 'http://127.0.0.1:8000/subscription/subscription/2/',
                "data": {
                    "url": "http://127.0.0.1:8000/subscription/subscription/2/",
                    "active": true,
                    "completed": false,
                    "contact_key": "contact_key_064001",
                    "created_at": "2014-08-05T11:31:50.908974",
                    "id": 2,
                    "lang": "en",
                    "messageset_id": 1,
                    "next_sequence_number": 1,
                    "process_status": 0,
                    "schedule": 1,
                    "to_addr": "+064002",
                    "updated_at": "2014-08-05T11:31:50.909025",
                }
            },
            'response': {
                "code": 200,
                "data": {
                    "success": "true"
                }
            }
        },
        {
            'request': {
                'method': 'PATCH',
                'headers': {
                    'Authorization': ['Token test_key']
                },
                'url': 'http://127.0.0.1:8000/subscription/subscription/3/',
                "data": {
                    "url": "http://127.0.0.1:8000/subscription/subscription/3/",
                    "active": true,
                    "completed": false,
                    "contact_key": "contact_key_064001",
                    "created_at": "2014-08-05T11:31:50.908974",
                    "id": 3,
                    "lang": "en",
                    "messageset_id": 1,
                    "next_sequence_number": 1,
                    "process_status": 0,
                    "schedule": 1,
                    "to_addr": "+064002",
                    "updated_at": "2014-08-05T11:31:50.909025",
                }
            },
            'response': {
                "code": 200,
                "data": {
                    "success": "true"
                }
            }
        },


    // GET TOPICS FOR REFUGEE STEP 1 - FAQ 11
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'headers': {
                    'Authorization': ['Basic ' + new Buffer('test:test').toString('base64')],
                    'Content-Type': ['application/json']
                },
                'url': 'https://app.besnappy.com/api/v1/account/1/faqs/11/topics'
            },
            'response': {
                "code": "200",
                "data": [
                {
                    "id": 1101,
                    "faq_id": 11,
                    "topic": "[en] When/where to apply",
                    "order": 0,
                    "created_at": "2014-01-08 02:15:05",
                    "updated_at": "2014-01-08 02:15:05",
                    "slug": "When/where to apply"
                }, {
                    "id": 1102,
                    "faq_id": 11,
                    "topic": "[en] The Process",
                    "order": 1,
                    "created_at": "2014-01-08 02:15:09",
                    "updated_at": "2014-01-08 02:15:09",
                    "slug": "The Process"
                }, {
                    "id": 1103,
                    "faq_id": 11,
                    "topic": "[en] Appl. Results",
                    "order": 2,
                    "created_at": "2014-01-08 02:15:07",
                    "updated_at": "2014-01-08 02:15:07",
                    "slug": "Appl. Results"
                }, {
                    "id": 1104,
                    "faq_id": 11,
                    "topic": "[en] Your Rights",
                    "order": 3,
                    "created_at": "2014-02-24 09:37:24",
                    "updated_at": "2014-02-24 09:37:24",
                    "slug": "Your Rights"
                }, {
                    "id": 1105,
                    "faq_id": 11,
                    "topic": "[en] Arrest",
                    "order": 4,
                    "created_at": "2014-01-08 02:15:06",
                    "updated_at": "2014-01-08 02:15:06",
                    "slug": "Arrest"
                }, {
                    "id": 1106,
                    "faq_id": 11,
                    "topic": "[en] Children",
                    "order": 5,
                    "created_at": "2014-01-08 02:15:05",
                    "updated_at": "2014-01-08 02:15:05",
                    "slug": "Children"
                }, {
                    "id": 1107,
                    "faq_id": 11,
                    "topic": "[en] Helplines",
                    "order": 6,
                    "created_at": "2014-01-08 02:15:05",
                    "updated_at": "2014-01-08 02:15:05",
                    "slug": "Helplines"
                },
                // switches to french here
                {
                    "id": 1108,
                    "faq_id": 11,
                    "topic": "[fr] When/where to appfr",
                    "order": 7,
                    "created_at": "2014-01-08 02:15:05",
                    "updated_at": "2014-01-08 02:15:05",
                    "slug": "When/where to apply"
                }, {
                    "id": 1109,
                    "faq_id": 11,
                    "topic": "[fr] The Procefr",
                    "order": 8,
                    "created_at": "2014-01-08 02:15:09",
                    "updated_at": "2014-01-08 02:15:09",
                    "slug": "The Process"
                }, {
                    "id": 1110,
                    "faq_id": 11,
                    "topic": "[fr] Appl. Resulfr",
                    "order": 9,
                    "created_at": "2014-01-08 02:15:07",
                    "updated_at": "2014-01-08 02:15:07",
                    "slug": "Appl. Results"
                }, {
                    "id": 1111,
                    "faq_id": 11,
                    "topic": "[fr] Your Righfr",
                    "order": 10,
                    "created_at": "2014-02-24 09:37:24",
                    "updated_at": "2014-02-24 09:37:24",
                    "slug": "Your Rights"
                }, {
                    "id": 1112,
                    "faq_id": 11,
                    "topic": "[fr] Arrefr",
                    "order": 11,
                    "created_at": "2014-01-08 02:15:06",
                    "updated_at": "2014-01-08 02:15:06",
                    "slug": "Arrest"
                }, {
                    "id": 1113,
                    "faq_id": 11,
                    "topic": "[fr] Childrfr",
                    "order": 12,
                    "created_at": "2014-01-08 02:15:05",
                    "updated_at": "2014-01-08 02:15:05",
                    "slug": "Children"
                }, {
                    "id": 1114,
                    "faq_id": 11,
                    "topic": "[fr] Helplinfr",
                    "order": 13,
                    "created_at": "2014-01-08 02:15:05",
                    "updated_at": "2014-01-08 02:15:05",
                    "slug": "Helplines"
                }
                ]
            }
        },

    // GET TOPICS FOR REFUGEE STEP 2 - FAQ 12
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'headers': {
                    'Authorization': ['Basic ' + new Buffer('test:test').toString('base64')],
                    'Content-Type': ['application/json']
                },
                'url': 'https://app.besnappy.com/api/v1/account/1/faqs/12/topics'
            },
            'response': {
                "code": "200",
                "data": []
            }
        },

    // GET TOPICS FOR REFUGEE tips - FAQ 13
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'headers': {
                    'Authorization': ['Basic ' + new Buffer('test:test').toString('base64')],
                    'Content-Type': ['application/json']
                },
                'url': 'https://app.besnappy.com/api/v1/account/1/faqs/13/topics'
            },
            'response': {
                "code": "200",
                "data": []
            }
        },

    // GET TOPICS FOR REFUGEE about - FAQ 14
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'headers': {
                    'Authorization': ['Basic ' + new Buffer('test:test').toString('base64')],
                    'Content-Type': ['application/json']
                },
                'url': 'https://app.besnappy.com/api/v1/account/1/faqs/14/topics'
            },
            'response': {
                "code": "200",
                "data": []
            }
        },

    // GET TOPICS FOR MIGRANT step 1 - FAQ 21
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'headers': {
                    'Authorization': ['Basic ' + new Buffer('test:test').toString('base64')],
                    'Content-Type': ['application/json']
                },
                'url': 'https://app.besnappy.com/api/v1/account/1/faqs/21/topics'
            },
            'response': {
                "code": "200",
                "data": []
            }
        },

    // GET TOPICS FOR MIGRANT step 2 - FAQ 22
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'headers': {
                    'Authorization': ['Basic ' + new Buffer('test:test').toString('base64')],
                    'Content-Type': ['application/json']
                },
                'url': 'https://app.besnappy.com/api/v1/account/1/faqs/22/topics'
            },
            'response': {
                "code": "200",
                "data": []
            }
        },

    // GET TOPICS FOR MIGRANT about - FAQ 23
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'headers': {
                    'Authorization': ['Basic ' + new Buffer('test:test').toString('base64')],
                    'Content-Type': ['application/json']
                },
                'url': 'https://app.besnappy.com/api/v1/account/1/faqs/23/topics'
            },
            'response': {
                "code": "200",
                "data": []
            }
        },

    // GET QUESTIONS FOR REFUGEE Step 1 When + Where - Faq_id 11, Topic_id 1108
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'headers': {
                    'Authorization': ['Basic ' + new Buffer('test:test').toString('base64')],
                    'Content-Type': ['application/json']
                },
                'url': 'https://app.besnappy.com/api/v1/account/1/faqs/11/topics/1108/questions'
            },
            'responses': [
                {
                    "code": 200,
                    "data": [
                        {
                            "id": 110801,
                            "account_id": "50",
                            "question": "[fr] Apply at Rfr",
                            "answer": "Apply immediately after you arrive by visiting a Refugee Reception Office (RRO). If an officer questions you before that, you must say you are going to apply.",
                            "created_at": "2013-11-19 09:17:34",
                            "updated_at": "2014-02-24 09:36:54",
                            "active": "1",
                            "parsed_answer": "Apply immediately after you arrive by visiting a Refugee Reception Office (RRO). If an officer questions you before that, you must say you are going to apply.",
                            "pivot": {
                                "topic_id": 1108,
                                "question_id": 110801,
                                "featured": "0",
                                "order": "0"
                            },
                            "account": {
                                "id": "50",
                                "organization": "One Less Thing",
                                "domain": "wcl.besnappy.com",
                                "plan_id": "4",
                                "active": "1",
                                "created_at": "2012-12-10 14:25:16",
                                "updated_at": "2014-06-19 15:26:05",
                                "custom_domain": null,
                                "trial_ends_at": "2013-06-28 23:59:00",
                                "cancel_message": null,
                                "forward_shown": "1",
                                "badge_url": null,
                                "last_paid_at": "2014-06-19 15:26:05",
                                "is_paid": true,
                                "is_trial": false
                            }
                        }, {
                            "id": 110802,
                            "account_id": "50",
                            "question": "[fr] Durbfr",
                            "answer": "Your nearest Refugee Reception Office (RRO) in Durban is situated at 132 Moore Street, Durban. Call them on 031-362-1205 or fax on 031-362-1220.",
                            "created_at": "2013-11-19 09:16:36",
                            "updated_at": "2013-11-19 14:34:50",
                            "active": "1",
                            "parsed_answer": "Your nearest Refugee Reception Office (RRO) in Durban is situated at 132 Moore Street, Durban. Call them on 031-362-1205 or fax on 031-362-1220.",
                            "pivot": {
                                "topic_id": 1108,
                                "question_id": 110802,
                                "featured": "0",
                                "order": "1"
                            },
                            "account": {
                                "id": "50",
                                "organization": "One Less Thing",
                                "domain": "wcl.besnappy.com",
                                "plan_id": "4",
                                "active": "1",
                                "created_at": "2012-12-10 14:25:16",
                                "updated_at": "2014-06-19 15:26:05",
                                "custom_domain": null,
                                "trial_ends_at": "2013-06-28 23:59:00",
                                "cancel_message": null,
                                "forward_shown": "1",
                                "badge_url": null,
                                "last_paid_at": "2014-06-19 15:26:05",
                                "is_paid": true,
                                "is_trial": false
                            }
                        }, {
                            "id": 110803,
                            "account_id": "50",
                            "question": "[fr] Musifr",
                            "answer": "Your nearest Refugee Reception Office (RRO) in Musina is situated at 8 Harold Street (next to the post office). Tel: 015-534-5300; Fax: 015-534-5332.",
                            "created_at": "2013-11-19 09:15:46",
                            "updated_at": "2014-02-21 12:04:14",
                            "active": "1",
                            "parsed_answer": "Your nearest Refugee Reception Office (RRO) in Musina is situated at 8 Harold Street (next to the post office). Tel: 015-534-5300; Fax: 015-534-5332.",
                            "pivot": {
                                "topic_id": "52",
                                "question_id": 110803,
                                "featured": "0",
                                "order": "2"
                            },
                            "account": {
                                "id": "50",
                                "organization": "One Less Thing",
                                "domain": "wcl.besnappy.com",
                                "plan_id": "4",
                                "active": "1",
                                "created_at": "2012-12-10 14:25:16",
                                "updated_at": "2014-06-19 15:26:05",
                                "custom_domain": "null",
                                "trial_ends_at": "2013-06-28 23:59:00",
                                "cancel_message": "null",
                                "forward_shown": "1",
                                "badge_url": "null",
                                "last_paid_at": "2014-06-19 15:26:05",
                                "is_paid": "true",
                                "is_trial": "false"
                            }
                        }
                    ]
                },
                {
                    "code": 200,
                    "data": [
                        {
                            "id": 110801,
                            "account_id": "50",
                            "question": "[fr] Apply at Rfr",
                            "answer": "Apply immediately after you arrive by visiting a Refugee Reception Office (RRO). If an officer questions you before that, you must say you are going to apply.",
                            "created_at": "2013-11-19 09:17:34",
                            "updated_at": "2014-02-24 09:36:54",
                            "active": "1",
                            "parsed_answer": "Apply immediately after you arrive by visiting a Refugee Reception Office (RRO). If an officer questions you before that, you must say you are going to apply.",
                            "pivot": {
                                "topic_id": 1108,
                                "question_id": 110801,
                                "featured": "0",
                                "order": "0"
                            },
                            "account": {
                                "id": "50",
                                "organization": "One Less Thing",
                                "domain": "wcl.besnappy.com",
                                "plan_id": "4",
                                "active": "1",
                                "created_at": "2012-12-10 14:25:16",
                                "updated_at": "2014-06-19 15:26:05",
                                "custom_domain": null,
                                "trial_ends_at": "2013-06-28 23:59:00",
                                "cancel_message": null,
                                "forward_shown": "1",
                                "badge_url": null,
                                "last_paid_at": "2014-06-19 15:26:05",
                                "is_paid": true,
                                "is_trial": false
                            }
                        }, {
                            "id": 110802,
                            "account_id": "50",
                            "question": "[fr] Durbfr",
                            "answer": "Your nearest Refugee Reception Office (RRO) in Durban is situated at 132 Moore Street, Durban. Call them on 031-362-1205 or fax on 031-362-1220.",
                            "created_at": "2013-11-19 09:16:36",
                            "updated_at": "2013-11-19 14:34:50",
                            "active": "1",
                            "parsed_answer": "Your nearest Refugee Reception Office (RRO) in Durban is situated at 132 Moore Street, Durban. Call them on 031-362-1205 or fax on 031-362-1220.",
                            "pivot": {
                                "topic_id": 1108,
                                "question_id": 110802,
                                "featured": "0",
                                "order": "1"
                            },
                            "account": {
                                "id": "50",
                                "organization": "One Less Thing",
                                "domain": "wcl.besnappy.com",
                                "plan_id": "4",
                                "active": "1",
                                "created_at": "2012-12-10 14:25:16",
                                "updated_at": "2014-06-19 15:26:05",
                                "custom_domain": null,
                                "trial_ends_at": "2013-06-28 23:59:00",
                                "cancel_message": null,
                                "forward_shown": "1",
                                "badge_url": null,
                                "last_paid_at": "2014-06-19 15:26:05",
                                "is_paid": true,
                                "is_trial": false
                            }
                        }, {
                            "id": 110803,
                            "account_id": "50",
                            "question": "[fr] Musifr",
                            "answer": "Your nearest Refugee Reception Office (RRO) in Musina is situated at 8 Harold Street (next to the post office). Tel: 015-534-5300; Fax: 015-534-5332.",
                            "created_at": "2013-11-19 09:15:46",
                            "updated_at": "2014-02-21 12:04:14",
                            "active": "1",
                            "parsed_answer": "Your nearest Refugee Reception Office (RRO) in Musina is situated at 8 Harold Street (next to the post office). Tel: 015-534-5300; Fax: 015-534-5332.",
                            "pivot": {
                                "topic_id": "52",
                                "question_id": 110803,
                                "featured": "0",
                                "order": "2"
                            },
                            "account": {
                                "id": "50",
                                "organization": "One Less Thing",
                                "domain": "wcl.besnappy.com",
                                "plan_id": "4",
                                "active": "1",
                                "created_at": "2012-12-10 14:25:16",
                                "updated_at": "2014-06-19 15:26:05",
                                "custom_domain": "null",
                                "trial_ends_at": "2013-06-28 23:59:00",
                                "cancel_message": "null",
                                "forward_shown": "1",
                                "badge_url": "null",
                                "last_paid_at": "2014-06-19 15:26:05",
                                "is_paid": "true",
                                "is_trial": "false"
                            }
                        }
                    ]
                }
            ]
        },

    // POST REPORT - XENOPHOBIA, LOOTING
        {
            'repeatable': true,
            'request': {
                'method': 'POST',
                'headers': {
                    'Authorization': ['Token nightingaleapikey']
                },
                'url': 'https://nightingale_root/api/v1/report/',
                "data": {
                    "contact_key": "contact_key_064001",
                    "to_addr": "+064001",
                    "categories": ["111","444"],
                    "location": {
                        "point": {
                            "type": "Point",
                            "coordinates": [3.1415, 2.7182]
                        }
                    },
                    "metadata": {
                        "language": "fr",
                        "status": "refugee",
                        "country": "drc"
                    }
                }
            },
            'response': {
                "code": "201",
                "data": {
                    "id": 888,
                    "contact_key": "contact_key_064001",
                    "to_addr": "+064001",
                    "categories": [
                        "111",
                        "444"
                    ],
                    "project": "project-id",
                    "location": {
                        "id": 1,
                        "point": {
                            "type": "Point",
                            "coordinates": [
                                3.1415,
                                2.7182
                            ]
                        }
                    },
                    "description": null,
                    "incident_at": null,
                    "metadata": {
                        "status": "refugee",
                        "country": "drc",
                        "language": "fr"
                    }
                }
            }
        },

    // POST REPORT - CORRUPTION, OTHER
        {
            'repeatable': true,
            'request': {
                'method': 'POST',
                'headers': {
                    'Authorization': ['Token nightingaleapikey']
                },
                'url': 'https://nightingale_root/api/v1/report/',
                "data": {
                    "contact_key": "contact_key_064001",
                    "to_addr": "+064001",
                    "categories": ["1111","999"],
                    "location": {
                        "point": {
                            "type": "Point",
                            "coordinates": [3.1415, 2.7182]
                        }
                    },
                    "metadata": {
                        "language": "fr",
                        "status": "refugee",
                        "country": "drc"
                    }
                }
            },
            'response': {
                "code": "201",
                "data": {
                    "id": 889,
                    "contact_key": "contact_key_064001",
                    "to_addr": "+064001",
                    "categories": [
                        "1111",
                        "999"
                    ],
                    "project": "project-id",
                    "location": {
                        "id": 1,
                        "point": {
                            "type": "Point",
                            "coordinates": [
                                3.1415,
                                2.7182
                            ]
                        }
                    },
                    "description": null,
                    "incident_at": null,
                    "metadata": {
                        "status": "refugee",
                        "country": "drc",
                        "language": "fr"
                    }
                }
            }
        },

    // GET REPORT 888
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'headers': {
                    'Authorization': ['Token nightingaleapikey']
                },
                'url': 'https://nightingale_root/api/v1/report/888/',
                "params": {}
            },
            'response': {
                "code": "200",
                "data": {
                    "id": 888,
                    "contact_key": "contact_key_064001",
                    "to_addr": "+064001",
                    "categories": [
                        "111",
                        "444"
                    ],
                    "project": "project-id",
                    "location": {
                        "id": 1,
                        "point": {
                            "type": "Point",
                            "coordinates": [
                                3.1415,
                                2.7182
                            ]
                        }
                    },
                    "description": null,
                    "incident_at": null,
                    "metadata": {
                        "status": "refugee",
                        "country": "drc",
                        "language": "fr"
                    }
                }
            }
        },

    // PATCH REPORT 888
        {
            'repeatable': true,
            'request': {
                'method': 'PATCH',
                'headers': {
                    'Authorization': ['Token nightingaleapikey']
                },
                'url': 'https://nightingale_root/api/v1/report/888/',
                "data": {
                    "description": "Send help plz"
                }
            },
            'response': {
                "code": "200",
                "data": {
                    "id": 888,
                    "contact_key": "contact_key_064001",
                    "to_addr": "+064001",
                    "categories": [
                        "111",
                        "444"
                    ],
                    "project": "project-id",
                    "location": {
                        "id": 1,
                        "point": {
                            "type": "Point",
                            "coordinates": [
                                3.1415,
                                2.7182
                            ]
                        }
                    },
                    "description": "Send help plz",
                    "incident_at": null,
                    "metadata": {
                        "status": "refugee",
                        "country": "drc",
                        "language": "fr"
                    }
                }
            }
        },


    // GET REPORT 889
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'headers': {
                    'Authorization': ['Token nightingaleapikey']
                },
                'url': 'https://nightingale_root/api/v1/report/889/',
                "params": {}
            },
            'response': {
                "code": "200",
                "data": {
                    "id": 889,
                    "contact_key": "contact_key_064001",
                    "to_addr": "+064001",
                    "categories": [
                        "1111",
                        "999"
                    ],
                    "project": "project-id",
                    "location": {
                        "id": 1,
                        "point": {
                            "type": "Point",
                            "coordinates": [
                                3.1415,
                                2.7182
                            ]
                        }
                    },
                    "description": null,
                    "incident_at": null,
                    "metadata": {
                        "status": "refugee",
                        "country": "drc",
                        "language": "fr"
                    }
                }
            }
        },

    // PATCH REPORT 889
        {
            'repeatable': true,
            'request': {
                'method': 'PATCH',
                'headers': {
                    'Authorization': ['Token nightingaleapikey']
                },
                'url': 'https://nightingale_root/api/v1/report/889/',
                "data": {
                    "description": "Send help plz"
                }
            },
            'response': {
                "code": "200",
                "data": {
                    "id": 889,
                    "contact_key": "contact_key_064001",
                    "to_addr": "+064001",
                    "categories": [
                        "1111",
                        "999"
                    ],
                    "project": "project-id",
                    "location": {
                        "id": 1,
                        "point": {
                            "type": "Point",
                            "coordinates": [
                                3.1415,
                                2.7182
                            ]
                        }
                    },
                    "description": "Send help plz",
                    "incident_at": null,
                    "metadata": {
                        "status": "refugee",
                        "country": "drc",
                        "language": "fr"
                    }
                }
            }
        },

    // POST RESPONSE TO REPORT 889
        {
            'repeatable': false,
            'request': {
                'method': 'POST',
                'headers': {
                    'Authorization': ['Token nightingaleapikey']
                },
                'url': 'https://nightingale_root/api/v1/snappymessage/',
                "data": {
                    "contact_key":"contact_key",
                    "from_addr":"+064001",
                    "report":"889",
                    "message":"I need more support"
                }
            },
            'response': {
                "code": "201",
                "data": {
                    "id": 44,
                    "integration": "integration_key_2939393",
                    "report": 889,
                    "target": "SNAPPY",
                    "message": "Response back from SMS",
                    "contact_key": "contact_key",
                    "from_addr": "+064001",
                    "to_addr": null,
                    "delivered": false,
                    "metadata": {}
                }
            }
        },

];
};
