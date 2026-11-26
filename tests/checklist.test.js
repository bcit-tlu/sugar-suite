const fs = require('fs');
const path = require('path');

const checklistCode = fs.readFileSync(path.join(__dirname, '../source/js/features/checklist.js'), 'utf8');
const accordionCode = fs.readFileSync(path.join(__dirname, '../source/js/features/accordion.js'), 'utf8');

describe('Checklist Component', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="checklist">
        <ul>
          <li>
            <p>Assignment 1</p>
            <p>@</p>
            <div class="quiz">
              <p>After submitting your assignment, please take the Week 2 quiz.</p>
            </div>
          </li>
        </ul>
      </div>
      <div class="accordion">
        <h2>Tolerance Levels</h2>
        <p>The human body has tolerance levels...</p>
        <h2>Multiple Kinds of Energy</h2>
        <p>The interaction of two or more kinds of energy...</p>
      </div>
    `;
  });

  test('should initialize show-after content when the @ marker is empty', () => {
    expect(() => eval(checklistCode)).not.toThrow();

    const showAfter = document.querySelector('.show-after');
    expect(showAfter).toBeInTheDocument();

    const revealedContent = showAfter.querySelector('ul > li');
    expect(revealedContent).toBeInTheDocument();
    expect(revealedContent.children).toHaveLength(1);
    expect(revealedContent.querySelector('.quiz')).toHaveTextContent('After submitting your assignment, please take the Week 2 quiz.');
  });

  test('should open accordion panels after empty-marker checklist initialization', async () => {
    eval(checklistCode);
    eval(accordionCode);

    const accordion = document.querySelector('.accordion');
    const buttons = accordion.querySelectorAll('.accordion-button');
    const panels = accordion.querySelectorAll('._bellow');

    expect(buttons).toHaveLength(2);
    expect(panels).toHaveLength(2);
    expect(panels[0]).not.toBeVisible();

    buttons[0].click();
    await $(panels[0]).promise();

    expect(buttons[0]).toHaveClass('open');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
    expect(panels[0]).toHaveClass('open');
    expect(panels[0]).toBeVisible();
  });
});
