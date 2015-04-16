module.exports = function() {
return [

    // Fixture 1 - Post
    {
        "request": {
            "method": "POST",
            "url": "http://example.com",
            "data": {
                "bar": "baz"
            }
        },
        "response": {
            "code": 200,
            "data": {
                "ham": "spam"
            }
        }
    },

    // Fixture 2 - Get
    {
        "request": {
            "method": "GET",
            "url": "http://example.com",
            "params": {
                "bar": "baz"
            }
        },
        "response": {
            "code": 200,
            "data": {
                "ham": "spam"
            }
        }
    }

];
};