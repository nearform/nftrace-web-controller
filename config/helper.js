var handlebars = require('hbs');

// global handlebars helpers

handlebars.registerHelper("debug", function(value) {
    console.log("Value");
    console.log("====================");
    console.log(value);
});

handlebars.registerHelper("checkStringTrue", function(value, options) {
    return value === 'true' ? options.fn() : options.inverse();
});