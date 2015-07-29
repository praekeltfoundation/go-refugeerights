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
                    'Authorization': ['Token test_key']
                },
                'url': 'http://127.0.0.1:8000/subscription/subscription/',
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
                'headers': ['Token test_key'],
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
                "data": {
                    "objects": [
                        {
                            "url": "http://127.0.0.1:8000/subscription/subscription/1/",
                            "active": true,
                            "completed": false,
                            "contact_key": "e5b0888cdb4347158ea5cd2f2147d28f",
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
                            "contact_key": "e5b0888cdb4347158ea5cd2f2147d28f",
                            "created_at": "2014-08-05T11:31:50.908974",
                            "id": 2,
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
            }
        },
        // 04b Patch subscriptions
        {
            'request': {
                'method': 'PATCH',
                'headers': {
                    'Authorization': ['Token test_key']
                },
                'url': 'http://127.0.0.1:8000/subscription/subscription/',
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
                            "to_addr": "+064002",
                            "updated_at": "2014-08-05T11:22:34.838996",
                        },
                        {
                            "url": "http://127.0.0.1:8000/subscription/subscription/2/",
                            "active": true,
                            "completed": false,
                            "contact_key": "e5b0888cdb4347158ea5cd2f2147d28f",
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
                "data": [{
                    "id": "11_01",
                    "faq_id": "11",
                    "topic": "When/where to apply",
                    "order": "0",
                    "created_at": "2014-01-08 02:15:05",
                    "updated_at": "2014-01-08 02:15:05",
                    "slug": "When/where to apply"
                }, {
                    "id": "11_02",
                    "faq_id": "11",
                    "topic": "The Process",
                    "order": "5",
                    "created_at": "2014-01-08 02:15:09",
                    "updated_at": "2014-01-08 02:15:09",
                    "slug": "The Process"
                }, {
                    "id": "11_03",
                    "faq_id": "11",
                    "topic": "Appl. Results",
                    "order": "4",
                    "created_at": "2014-01-08 02:15:07",
                    "updated_at": "2014-01-08 02:15:07",
                    "slug": "Appl. Results"
                }, {
                    "id": "11_04",
                    "faq_id": "11",
                    "topic": "Your Rights",
                    "order": "3",
                    "created_at": "2014-02-24 09:37:24",
                    "updated_at": "2014-02-24 09:37:24",
                    "slug": "Your Rights"
                }, {
                    "id": "11_05",
                    "faq_id": "11",
                    "topic": "Arrest",
                    "order": "2",
                    "created_at": "2014-01-08 02:15:06",
                    "updated_at": "2014-01-08 02:15:06",
                    "slug": "Arrest"
                }, {
                    "id": "11_06",
                    "faq_id": "11",
                    "topic": "Children",
                    "order": "1",
                    "created_at": "2014-01-08 02:15:05",
                    "updated_at": "2014-01-08 02:15:05",
                    "slug": "Children"
                }, {
                    "id": "11_07",
                    "faq_id": "11",
                    "topic": "Helplines",
                    "order": "6",
                    "created_at": "2014-01-08 02:15:05",
                    "updated_at": "2014-01-08 02:15:05",
                    "slug": "Helplines"
                }]
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

    // GET QUESTIONS FOR REFUGEE Step 1 When + Where - Faq_id 11, Topic_id 11_01
        {
            'repeatable': true,
            'request': {
                'method': 'GET',
                'headers': {
                    'Authorization': ['Basic ' + new Buffer('test:test').toString('base64')],
                    'Content-Type': ['application/json']
                },
                'url': 'https://app.besnappy.com/api/v1/account/1/faqs/11/topics/11_01/questions'
            },
            'responses': [
                {
                    "code": 200,
                    "data": [
                        {
                            "id": "11_01_01",
                            "account_id": "50",
                            "question": "Apply at RRO",
                            "answer": "Apply immediately after you arrive by visiting a Refugee Reception Office (RRO). If an officer questions you before that, you must say you are going to apply.",
                            "created_at": "2013-11-19 09:17:34",
                            "updated_at": "2014-02-24 09:36:54",
                            "active": "1",
                            "parsed_answer": "Apply immediately after you arrive by visiting a Refugee Reception Office (RRO). If an officer questions you before that, you must say you are going to apply.",
                            "pivot": {
                                "topic_id": "11_01",
                                "question_id": "11_01_01",
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
                            "id": "11_01_02",
                            "account_id": "50",
                            "question": "Durban",
                            "answer": "Your nearest Refugee Reception Office (RRO) in Durban is situated at 132 Moore Street, Durban. Call them on 031-362-1205 or fax on 031-362-1220.",
                            "created_at": "2013-11-19 09:16:36",
                            "updated_at": "2013-11-19 14:34:50",
                            "active": "1",
                            "parsed_answer": "Your nearest Refugee Reception Office (RRO) in Durban is situated at 132 Moore Street, Durban. Call them on 031-362-1205 or fax on 031-362-1220.",
                            "pivot": {
                                "topic_id": "11_01",
                                "question_id": "11_01_02",
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
                            "id": "11_01_03",
                            "account_id": "50",
                            "question": "Musina",
                            "answer": "Your nearest Refugee Reception Office (RRO) in Musina is situated at 8 Harold Street (next to the post office). Tel: 015-534-5300; Fax: 015-534-5332.",
                            "created_at": "2013-11-19 09:15:46",
                            "updated_at": "2014-02-21 12:04:14",
                            "active": "1",
                            "parsed_answer": "Your nearest Refugee Reception Office (RRO) in Musina is situated at 8 Harold Street (next to the post office). Tel: 015-534-5300; Fax: 015-534-5332.",
                            "pivot": {
                                "topic_id": "52",
                                "question_id": "11_01_03",
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
                            "id": "11_01_01",
                            "account_id": "50",
                            "question": "Apply at RRO",
                            "answer": "Apply immediately after you arrive by visiting a Refugee Reception Office (RRO). If an officer questions you before that, you must say you are going to apply.",
                            "created_at": "2013-11-19 09:17:34",
                            "updated_at": "2014-02-24 09:36:54",
                            "active": "1",
                            "parsed_answer": "Apply immediately after you arrive by visiting a Refugee Reception Office (RRO). If an officer questions you before that, you must say you are going to apply.",
                            "pivot": {
                                "topic_id": "11_01",
                                "question_id": "11_01_01",
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
                            "id": "11_01_02",
                            "account_id": "50",
                            "question": "Durban",
                            "answer": "Your nearest Refugee Reception Office (RRO) in Durban is situated at 132 Moore Street, Durban. Call them on 031-362-1205 or fax on 031-362-1220.",
                            "created_at": "2013-11-19 09:16:36",
                            "updated_at": "2013-11-19 14:34:50",
                            "active": "1",
                            "parsed_answer": "Your nearest Refugee Reception Office (RRO) in Durban is situated at 132 Moore Street, Durban. Call them on 031-362-1205 or fax on 031-362-1220.",
                            "pivot": {
                                "topic_id": "11_01",
                                "question_id": "11_01_02",
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
                            "id": "11_01_03",
                            "account_id": "50",
                            "question": "Musina",
                            "answer": "Your nearest Refugee Reception Office (RRO) in Musina is situated at 8 Harold Street (next to the post office). Tel: 015-534-5300; Fax: 015-534-5332.",
                            "created_at": "2013-11-19 09:15:46",
                            "updated_at": "2014-02-21 12:04:14",
                            "active": "1",
                            "parsed_answer": "Your nearest Refugee Reception Office (RRO) in Musina is situated at 8 Harold Street (next to the post office). Tel: 015-534-5300; Fax: 015-534-5332.",
                            "pivot": {
                                "topic_id": "52",
                                "question_id": "11_01_03",
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

];
};
