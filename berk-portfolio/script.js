(() => {
  const root = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('berk-portfolio-theme');
  if (savedTheme) root.dataset.theme = savedTheme;

  function updateThemeLabel() {
    const isDark = root.dataset.theme === 'dark';
    themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', isDark ? '#0b1220' : '#f6f8fb');
  }
  updateThemeLabel();
  themeToggle.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('berk-portfolio-theme', root.dataset.theme);
    updateThemeLabel();
  });

  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 8), { passive: true });

  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('nav-links');
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });
  navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open navigation');
  }));

  const guideToggle = document.getElementById('guide-toggle');
  const guidePanel = document.getElementById('guide-panel');
  const guideClose = document.getElementById('guide-close');
  const guideInput = document.getElementById('guide-input');
  const messages = document.getElementById('guide-messages');
  const guideForm = document.getElementById('guide-form');
  const responses = [
    {
      tags: ['experience', 'work', 'intern', 'dogus', 'doğuş', 'hepsiburada', 'soc', 'qradar'],
      response: 'Berk has worked in cybersecurity, software engineering, and DevOps. At Doğuş Teknoloji, the work included QRadar log onboarding, AQL/Regex detection logic, MITRE ATT&CK mapping, Defender XDR investigations, and Cortex XSOAR. At Hepsiburada, the work focused on Kubernetes, Terraform, Ansible, GitLab CI, and Vault.'
    },
    {
      tags: ['research', 'gnn', 'lstm', 'alert', 'fatigue', 'machine learning', 'ml', 'ai', 'xai'],
      response: 'The featured research project addresses multi-SIEM alert fatigue. It clusters alerts, models related entities in a heterogeneous graph, produces embeddings with GATv2 and GraphSAGE, then applies an LSTM to rank sequences for analyst review. The design also emphasizes interpretable prioritization.'
    },
    {
      tags: ['stack', 'skills', 'tech', 'python', 'pytorch', 'kubernetes', 'terraform', 'security'],
      response: 'Core stack: Python, PyTorch, GNNs, LSTMs, SQL, Linux, Java, Kotlin, Spring Boot, Redis, Apache Airflow, Kubernetes, Terraform, Ansible, GitLab CI, HashiCorp Vault, IBM QRadar, Microsoft Defender, Cortex XSOAR, and MITRE ATT&CK.'
    },
    {
      tags: ['contact', 'email', 'linkedin', 'github', 'reach'],
      response: 'Email: berkgoktasedu@gmail.com. LinkedIn: linkedin.com/in/berkgoktas. GitHub: github.com/berkgoktash.'
    },
    {
      tags: ['education', 'university', 'bogazici', 'boğaziçi', 'gpa', 'exchange'],
      response: 'Berk completed a BSc in Computer Engineering at Boğaziçi University with a 3.64 GPA and High Honor standing. He also completed a Computer Science exchange at the Hong Kong University of Science and Technology.'
    }
  ];

  function openGuide() {
    guidePanel.hidden = false;
    guideToggle.setAttribute('aria-expanded', 'true');
    setTimeout(() => guideInput.focus(), 0);
  }
  function closeGuide() {
    guidePanel.hidden = true;
    guideToggle.setAttribute('aria-expanded', 'false');
    guideToggle.focus();
  }
  guideToggle.addEventListener('click', () => guidePanel.hidden ? openGuide() : closeGuide());
  guideClose.addEventListener('click', closeGuide);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !guidePanel.hidden) closeGuide(); });

  function appendMessage(text, role) {
    const message = document.createElement('div');
    message.className = `guide-message ${role}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function findResponse(query) {
    const normalized = query.toLocaleLowerCase('tr-TR');
    let winner = null;
    let score = 0;
    for (const item of responses) {
      const itemScore = item.tags.reduce((sum, tag) => sum + (normalized.includes(tag) ? 1 : 0), 0);
      if (itemScore > score) { score = itemScore; winner = item; }
    }
    return winner ? winner.response : 'This guide is limited to the public portfolio profile. Use the site sections for experience, research, technical capabilities, credentials, and contact details.';
  }

  function processQuery(query) {
    const clean = query.trim();
    if (!clean) return;
    appendMessage(clean, 'user');
    const response = findResponse(clean);
    window.setTimeout(() => appendMessage(response, 'bot'), 180);
  }
  guideForm.addEventListener('submit', event => {
    event.preventDefault();
    processQuery(guideInput.value);
    guideInput.value = '';
  });
  document.querySelectorAll('[data-prompt]').forEach(button => button.addEventListener('click', () => processQuery(button.dataset.prompt)));
})();
