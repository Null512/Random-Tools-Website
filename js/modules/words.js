/* Word counter, with the numbers people actually ask for: characters with and without
   spaces, words, sentences, paragraphs and reading time. */
(function () {
  'use strict';

  RT.register({
    id: 'words',
    title: 'Word counter',
    keywords: 'word count characters letters sentences paragraphs reading time',

    render: function (root, ctx) {
      var el = ctx.el;
      var stats = el('div', { class: 'stat-grid' });

      var input = el('textarea', {
        class: 'input textarea textarea-tall', rows: 5, placeholder: 'Type or paste text',
        'aria-label': 'Text to count', oninput: count
      });

      function stat(value, label) {
        return el('div', { class: 'stat' }, [
          el('strong', { class: 'stat-value mono', text: value }),
          el('span', { class: 'stat-label', text: label })
        ]);
      }

      function count() {
        var text = input.value;
        var trimmed = text.trim();
        var wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
        var sentences = trimmed ? (trimmed.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || []).length : 0;
        var paragraphs = trimmed ? trimmed.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length : 0;
        var readingMinutes = wordCount / 220;
        var reading = !wordCount ? '0s'
          : readingMinutes < 1 ? Math.max(1, Math.round(readingMinutes * 60)) + 's'
          : Math.round(readingMinutes) + 'm';

        stats.textContent = '';
        stats.appendChild(stat(wordCount, 'Words'));
        stats.appendChild(stat(text.length, 'Characters'));
        stats.appendChild(stat(text.replace(/\s/g, '').length, 'Without spaces'));
        stats.appendChild(stat(sentences, 'Sentences'));
        stats.appendChild(stat(paragraphs, 'Paragraphs'));
        stats.appendChild(stat(text ? text.split(/\r\n|\r|\n/).length : 0, 'Lines'));
        stats.appendChild(stat(reading, 'Read aloud'));
      }

      root.appendChild(input);
      root.appendChild(stats);
      count();
    }
  });
})();
