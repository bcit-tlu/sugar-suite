const fs = require('fs');
const path = require('path');

const knowledgeCheckCode = fs.readFileSync(path.join(__dirname, '../source/js/features/knowledge-check.js'), 'utf8');

describe('Knowledge Check matching', () => {
  const pairs = [
    ['Salt & pepper', 'Seasoning'],
    ['Bread', 'Mac & cheese'],
    ['Tea', 'Biscuits'],
    ['5 < 6 > 4', '"Quoted" & \'single\''],
    ['Crème brûlée', 'Déjà vu 😀'],
    ['Literal &amp; text', 'Entity'],
  ];

  beforeEach(() => {
    $.fx.off = true;
    document.body.innerHTML = `
      <div class="knowledge-check development">
        <ol>
          <li>
            <p>Type: match</p>
            <ul>
              <li>Salt &amp; pepper = Seasoning</li>
              <li>Bread = Mac &amp; cheese</li>
              <li>Tea = Biscuits</li>
              <li>5 &lt; 6 &gt; 4 = "Quoted" &amp; 'single'</li>
              <li>Crème brûlée = Déjà vu 😀</li>
              <li>Literal &amp;amp; text = Entity</li>
            </ul>
          </li>
        </ol>
      </div>
    `;
    eval(knowledgeCheckCode);
  });

  function submitMatches(matches) {
    const leftIndexes = {};

    $('.matchAns li').each(function (index) {
      leftIndexes[$(this).text()] = index + 1;
    });

    $('.matching li').each(function () {
      const right = $(this).find('label').text();
      const pair = matches.find((item) => item[1] === right);
      $(this).find('input').val(leftIndexes[pair[0]]);
    });

    $('form').trigger('submit');
  }

  test('marks correct answers containing special characters as correct', () => {
    submitMatches(pairs);

    expect($('.matching .correct')).toHaveLength(pairs.length);
    expect($('.matching .incorrect')).toHaveLength(0);
    expect($('.score').text()).toBe(`Score: ${pairs.length}/${pairs.length}`);
  });

  test('marks wrong matches as incorrect', () => {
    const wrongMatches = pairs.map((pair, index) => [pairs[(index + 1) % pairs.length][0], pair[1]]);

    submitMatches(wrongMatches);

    expect($('.matching .correct')).toHaveLength(0);
    expect($('.matching .incorrect')).toHaveLength(pairs.length);
    expect($('.score').text()).toBe(`Score: 0/${pairs.length}`);
  });
});
