var fs = require('fs');
var sys = require('sys');
var path = require('path');

var options = {};
var console = require('vows/console');
var stylize = console.stylize,
    puts = console.puts(options);

var cwd = process.cwd();
    
var suites = {};
var suite = function(results) {return {tests: [], results: results }};

this.name = 'xml';

this.report = function (data, s) {
    var event = data[1];

    options.stream = typeof(s) === 'object' ? s : process.stdout;
    buffer = [];

    switch (data[0]) {
        case 'subject':
            
            puts('\n♢ ' + stylize(event[0], 'bold') + '\n');
            suites[event[0]] = suite(event[1])
            break;
        case 'context':
            puts(this.contextText(event));
            break;
        case 'vow':    
            puts(this.vowText(event));
            suites[event.subject] && suites[event.subject].tests.push(event);
            break;
        case 'end':
            sys.print('\n');
            break;
        case 'finish':
            puts(console.result(event).join('\n'));
            writeXML();
            break;
        case 'error':
            puts(console.error(event));
            break;
    }
};

this.contextText = function (event) {
    return '  ' + event;
};

this.vowText = function (event) {
    var buffer = [];

    //sys.puts(sys.inspect(event))
    buffer.push('   ' + {
        honored: ' ✓ ',
        broken:  ' ✗ ',
        errored: ' ✗ ',
        pending: ' - '
    }[event.status] + stylize(event.title, ({
        honored: 'green',
        broken:  'yellow',
        errored: 'red',
        pending: 'cyan'
    })[event.status]));

    if (event.status === 'broken') {
        buffer.push('      » ' + event.exception);
    } else if (event.status === 'errored') {
        if (event.exception.type === 'promise') {
            buffer.push('      » ' + stylize("An unexpected error was caught: " +
                           stylize(event.exception.error, 'bold'), 'red'));
        } else {
            buffer.push('    ' + stylize(event.exception, 'red'));
        }
    }
    return buffer.join('\n');
};

this.print = function (str) {
    sys.print(str);
};

var setupXMLDir = function(dir) {
    try {
        fs.statSync(dir);
        var files = fs.readdirSync(dir);
        if (files.length) {
            for (var i=0,file; file = files[i]; i++) {
                fs.unlinkSync(path.join(dir, file));
            }
        }
        fs.rmdirSync(dir);
    } catch(e) {}
    fs.mkdirSync(dir, 0777);
};

var writeXML = function() {
    var outputDir = path.join(cwd, "xml-reports");
    setupXMLDir(outputDir);

    for (var suiteName in suites) {
        var suite = suites[suiteName];
        var fileName = ("XML-" + suiteName + ".xml").replace(/[^a-z0-9\-\.]/gi, "_");
        var xml = '<?xml version="1.0" encoding="UTF-8" ?>'
        xml += '<testsuite errors="0" failures="' 
            + suite.results.failures + '" name="' 
            + suiteName + '" tests="' 
            + suite.results.total + '" time="'
            + suite.results.time + '" >';
        for (var i in suite.tests) {
            var test = suite.tests[i];
            if (!test.exception) {
                xml += '<testcase classname="' + test.context + '" name="' + test.title + '" time="0" />'
            } else {
                var type = test.exception.substr(0, test.exception.indexOf(":"));
                var msg = test.exception.substr(test.exception.indexOf(":") + 1, test.exception.indexOf("\n") - 1)
                            .replace("\n", "");

                xml += '<testcase classname="' + test.context + '" name="' + test.title + '" time="0" >'
                xml += '<error message="' + msg + '" type="' + type + '">'
                    + test.exception + '</error></testcase>';
            }
        }
        xml += '</testsuite>'
        var fp = path.join(outputDir, fileName);
        var fd = fs.writeFileSync(fp, xml);
    }

}
