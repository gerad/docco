(function() {
  var _a, _b, _c, destination, docco_styles, docco_template, ensure_directories, exec, ext, fs, generate_documentation, generate_html, generate_tests, get_language, highlight, highlight_end, highlight_start, l, languages, parse, path, print, puts, showdown, spawn, template, test_destination;
  var __hasProp = Object.prototype.hasOwnProperty;
  generate_documentation = function(source, sources, callback) {
    return fs.readFile(source, "utf-8", function(error, code) {
      var sections;
      if (error) {
        throw error;
      }
      sections = parse(source, code);
      puts(("docco: " + (source)));
      return highlight(source, sections, function() {
        generate_html(source, sources, sections);
        generate_tests(source, sections);
        return callback();
      });
    });
  };
  exports.parse = (parse = function(source, code) {
    var _a, _b, _c, code_text, docs_text, has_code, language, line, lines, save, sections, test_text;
    lines = code.split('\n');
    sections = [];
    language = get_language(source);
    has_code = (docs_text = (code_text = (test_text = '')));
    save = function() {
      return sections.push({
        docs: docs_text,
        code: code_text,
        test: test_text
      });
    };
    _b = lines;
    for (_a = 0, _c = _b.length; _a < _c; _a++) {
      line = _b[_a];
      if (line.match(language.comment_matcher)) {
        if (has_code) {
          save();
          has_code = (docs_text = (test_text = (code_text = '')));
        }
        line = line.replace(language.comment_matcher, '') + '\n';
        docs_text += line;
        line.match(/^( {4}|\t)[^>]/) ? test_text += line.replace(/^( {4}|\t)/, '') : null;
      } else {
        has_code = true;
        code_text += line + '\n';
      }
    }
    save();
    return sections;
  });
  highlight = function(source, sections, callback) {
    var _a, _b, _c, _d, language, output, pygments, section;
    language = get_language(source);
    pygments = spawn('pygmentize', ['-l', language.name, '-f', 'html', '-O', 'encoding=utf-8']);
    output = '';
    pygments.stderr.addListener('data', function(error) {
      if (error) {
        return puts(error);
      }
    });
    pygments.stdout.addListener('data', function(result) {
      if (result) {
        return output += result;
      }
    });
    pygments.addListener('exit', function() {
      var _a, _b, fragments, i, section;
      output = output.replace(highlight_start, '').replace(highlight_end, '');
      fragments = output.split(language.divider_html);
      _a = sections;
      for (i = 0, _b = _a.length; i < _b; i++) {
        section = _a[i];
        section.code_html = highlight_start + fragments[i] + highlight_end;
        section.docs_html = showdown.makeHtml(section.docs);
      }
      return callback();
    });
    pygments.stdin.write((function() {
      _a = []; _c = sections;
      for (_b = 0, _d = _c.length; _b < _d; _b++) {
        section = _c[_b];
        _a.push(section.code);
      }
      return _a;
    })().join(language.divider_text));
    return pygments.stdin.end();
  };
  generate_html = function(source, sources, sections) {
    var dest, html, title;
    title = path.basename(source);
    dest = destination(source);
    html = docco_template({
      title: title,
      sections: sections,
      sources: sources,
      path: path,
      destination: destination
    });
    puts(("  -> " + (dest)));
    return fs.writeFile(dest, html);
  };
  generate_tests = function(source, sections) {
    var _a, _b, _c, comment, dest, fd, language, section;
    dest = test_destination(source);
    language = get_language(source);
    puts(("  -> " + (dest)));
    fd = fs.openSync(dest, 'w+');
    _b = sections;
    for (_a = 0, _c = _b.length; _a < _c; _a++) {
      section = _b[_a];
      if (section.test) {
        comment = section.code == undefined ? undefined : section.code.split("\n")[0];
        if (comment) {
          fs.writeSync(fd, ("" + (language.symbol) + " ## " + (comment) + "\n"));
        }
        fs.writeSync(fd, section.test + "\n\n");
      }
    }
    return fs.closeSync(fd);
  };
  fs = require('fs');
  path = require('path');
  showdown = require('./../vendor/showdown').Showdown;
  _a = require('child_process');
  spawn = _a.spawn;
  exec = _a.exec;
  _b = require('sys');
  puts = _b.puts;
  print = _b.print;
  languages = {
    '.coffee': {
      name: 'coffee-script',
      symbol: '#'
    },
    '.js': {
      name: 'javascript',
      symbol: '//',
      '.rb': {
        name: 'ruby',
        symbol: '#'
      }
    }
  };
  _c = languages;
  for (ext in _c) {
    if (!__hasProp.call(_c, ext)) continue;
    l = _c[ext];
    l.comment_matcher = new RegExp('^\\s*' + l.symbol + '\\s?');
    l.divider_text = '\n' + l.symbol + 'DIVIDER\n';
    l.divider_html = new RegExp('\\n*<span class="c1">' + l.symbol + 'DIVIDER<\\/span>\\n*');
  }
  get_language = function(source) {
    return languages[path.extname(source)];
  };
  destination = function(filepath) {
    return 'docs/' + path.basename(filepath, path.extname(filepath)) + '.html';
  };
  test_destination = function(filepath) {
    return 'test/' + path.basename(filepath, path.extname(filepath)) + '_examples' + path.extname(filepath);
  };
  ensure_directories = function(callback) {
    return exec('mkdir -p docs test', function() {
      return callback();
    });
  };
  template = function(str) {
    return new Function('obj', 'var p=[],print=function(){p.push.apply(p,arguments);};' + 'with(obj){p.push(\'' + str.replace(/[\r\t\n]/g, " ").replace(/'(?=[^<]*%>)/g, "\t").split("'").join("\\'").split("\t").join("'").replace(/<%=(.+?)%>/g, "',$1,'").split('<%').join("');").split('%>').join("p.push('") + "');}return p.join('');");
  };
  docco_template = template(fs.readFileSync(__dirname + '/../resources/docco.jst').toString());
  docco_styles = fs.readFileSync(__dirname + '/../resources/docco.css').toString();
  highlight_start = '<div class="highlight"><pre>';
  highlight_end = '</pre></div>';
  exports.generate = function(sources) {
    return ensure_directories(function() {
      var files, next_file;
      fs.writeFile('docs/docco.css', docco_styles);
      files = sources.slice(0);
      next_file = function() {
        if (files.length) {
          return generate_documentation(files.shift(), sources, next_file);
        }
      };
      return next_file();
    });
  };
})();
