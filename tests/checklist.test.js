const fs = require('fs');
const path = require('path');

const checklistCode = fs.readFileSync(path.join(__dirname, '../source/js/features/checklist.js'), 'utf8');

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
});
