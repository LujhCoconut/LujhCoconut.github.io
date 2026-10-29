// Page copy lives here so the terminal logic does not become another legacy pile.
import { recentUpdates } from './recent.generated.js';
import { essayEntries } from './essays.generated.js';

const command = (name, label = name) =>
  `<a class="terminal-link" href="#${encodeURIComponent(name)}" data-command="${name}">${label}</a>`;

const link = (href, label) => {
  const external = href.startsWith('http') ? ' target="_blank" rel="noreferrer noopener"' : '';
  return `<a class="terminal-link" href="${href}"${external}>${label}</a>`;
};

const heading = (title) => `
  <h1 class="terminal-title"># ${title}</h1>
  <div class="terminal-rule" aria-hidden="true">────────────────────────────────────────</div>`;

export const pages = {
  about: `${heading('Jiahao Lu / 卢佳豪 <span class="terminal-dim">(Coconut)</span>')}
    <dl class="terminal-kv">
      <dt>status</dt><dd>M.S. student in Artificial Intelligence, 2024—2027</dd>
      <dt>school</dt><dd>${link('https://www.xmu.edu.cn/', 'Xiamen University (XMU)')}</dd>
      <dt>research</dt><dd>Computer Architecture · Operating Systems</dd>
      <dt>location</dt><dd>Xiamen, China · Ningbo, China</dd>
    </dl>
    <p>My name is Jiahao Lu (卢佳豪). I am currently a third-year (2024-2027) Master's student in Artificial Intelligence at Xiamen University(XMU). My specific research focus are <strong>computer architecture</strong> and <strong>operating system</strong>.</p>
    <p>🔭 I’m currently working on memory architecture and systems. Specifically, my focus includes memory pooling and tiering (including support for AI infrastructure) and cache design for accelerators. Additionally, I’m exploring page tables, optical (fiber) memory, microkernels, agentic OS, self-evolving agent and sandbox.</p>
    <p>✨ I interned at <strong>Approaching.AI</strong> (2026.03-2026.08), working on the development of <strong>Mooncake</strong>. <em>Approaching.AI</em> is a company with an exceptional culture that blends academic rigor with engineering excellence. We warmly welcome you to join us.</p>
    <p>🤔 Feel free to reach out via email for any related questions.</p>
    <h2 class="terminal-section">## Navigate</h2>
    <ul class="terminal-list links">
      <li>${command('publications')} <span class="terminal-dim">— selected papers</span></li>
      <li>${command('recent')} <span class="terminal-dim">— recently added notes and reading</span></li>
      <li>${command('presentations')} <span class="terminal-dim">— presentations and mini courses</span></li>
      <li>${command('notes')} <span class="terminal-dim">— long-form notes from the legacy site</span></li>
      <li>${command('essays')} <span class="terminal-dim">— 碎碎念与随笔</span></li>
      <li>${command('contact')} <span class="terminal-dim">— email and GitHub</span></li>
    </ul>
    <p class="terminal-tip">This page doubles as a small shell. Type ${command('help')}, click any command, or press Tab to complete one.</p>`,

  publications: `${heading('Selected Publications')}
    <div class="terminal-entry">
      <p><span class="terminal-tag">SC'26</span><strong>Chisa: Dynamic Logical Way Partitioning for Efficient Caching in Sparse Accelerators</strong></p>
      <p class="terminal-dim"><strong>Jiahao Lu</strong>, Zhirong Shen, and Jiwu Shu.</p>
    </div>
    <div class="terminal-entry">
      <p><span class="terminal-tag">ATC'24</span><strong>Removing Obstacles before Breaking Through the Memory Wall: A Close Look at HBM Errors in the Field</strong></p>
      <p class="terminal-dim">Ronglong Wu, Shuyue Zhou, <strong>Jiahao Lu</strong>, Zhirong Shen, Zikang Xu, Jiwu Shu, et al.</p>
    </div>
    <div class="terminal-entry">
      <p><span class="terminal-tag">ACM TOS</span><strong>Looking Back to Move Forward: Unveiling the Mysteries of HBM Errors to Predict Future Failures</strong></p>
      <p class="terminal-dim">Shuyue Zhou, Xinbin Hu, Ronglong Wu, <strong>Jiahao Lu</strong>, Zhirong Shen, Zikang Xu, et al. Extended ATC'24 paper.</p>
    </div>
    <p class="terminal-dim">More work is under review and in progress.</p>`,

  recent: `${heading('Recent Update')}
    <p>Recently added paper notes, tutorials, reproductions, and assorted reading.</p>
    <ul class="terminal-list links">
      ${recentUpdates.map(([href, label]) => `<li>${link(href, label)}</li>`).join('\n      ')}
    </ul>`,

  presentations: `${heading('Presentations')}
    <div class="terminal-entry">
      <p><span class="terminal-tag">Meetup</span>${link('./presentation/vllm_meetup_hangzhou_jiahaolu.pptx', 'Mooncake x llm-d: Building High-Performance Inference Clusters in the Era of Agentic AI')}</p>
      <p class="terminal-dim">vLLM Meetup · Hangzhou · 2026-05-23</p>
    </div>
    <div class="terminal-entry">
      <p><span class="terminal-tag">Course</span>${link('https://www.bilibili.com/video/BV1gRNF6PEc3/', 'vLLM x Mooncake: KV Connector — The Past, The Present, The Future')}</p>
      <p class="terminal-dim">vLLM mini courses · Bilibili · 2026-07-11</p>
    </div>`,

  notes: `${heading('Notes & Tutorials')}
    <p>The original articles stay exactly where they are; this is a terminal-style index into them.</p>
    <h2 class="terminal-section">## Systems & Architecture</h2>
    <ul class="terminal-list links">
      <li>${link('./gem5.html', 'gem5 Emulator')} <span class="terminal-dim">— source-code perspective</span></li>
      <li>${link('./linux_kernel.html', 'Understand the Linux Kernel')}</li>
      <li>${link('./pim.html', 'PIM / NDP')} <span class="terminal-dim">— 存内计算与近数据处理</span></li>
      <li>${link('./GPULearning.html', 'GPU Learning')} <span class="terminal-dim">— GPU memory</span></li>
      <li>${link('./MLSys.html', 'MLSys / LLMSys / LLM Application')}</li>
      <li>${link('./simulator/simulator.html', 'Simulators')} <span class="terminal-dim">— QEMU · ZSim · gem5</span></li>
    </ul>
    <h2 class="terminal-section">## Paper Notes</h2>
    <ul class="terminal-list links">
      <li>${link('./OSDI.html', 'OSDI')} · ${link('./SOSP.html', 'SOSP')} · ${link('./EuroSys.html', 'EuroSys')}</li>
      <li>${link('./HPCA.html', 'HPCA')} · ${link('./ASPLOS.html', 'ASPLOS')} · ${link('./MICRO.html', 'MICRO')}</li>
      <li>${link('./others.html', 'Other venues')} <span class="terminal-dim">— SIGMOD · VLDB · ICDE · Security · SRDS</span></li>
    </ul>
    <h2 class="terminal-section">## Small Things</h2>
    <ul class="terminal-list links">
      <li>${link('./problems.html', 'Bugs & Problems Fixed')}</li>
      <li>${link('./tools.html', 'Fundamental Tools')} <span class="terminal-dim">— Linux CLI · Vim · SSH · SCP</span></li>
      <li>${link('./draw/draw.html', '科研制图 Python 模板')}</li>
      <li>${link('./trivial_obs.html', '杂货铺')} <span class="terminal-dim">— assorted ideas and observations</span></li>
    </ul>`,

  essays: `${heading('碎碎念 / Essays')}
    <p>零散想法、日常记录和不一定成熟的随笔。</p>
    ${essayEntries.length
      ? `<ul class="terminal-list links">${essayEntries.map(([href, label]) => `<li>${link(href, label)}</li>`).join('')}</ul>`
      : '<p class="terminal-dim">No essays yet. Add a Markdown or HTML file to the essays/ directory and it will appear here automatically.</p>'}`,

  contact: `${heading('Contact')}
    <dl class="terminal-kv">
      <dt>email</dt><dd>${link('mailto:lujhcoconut@foxmail.com', 'lujhcoconut@foxmail.com')}</dd>
      <dt>github</dt><dd>${link('https://github.com/LujhCoconut', 'github.com/LujhCoconut')}</dd>
      <dt>location</dt><dd>Xiamen, China · Ningbo, China</dd>
    </dl>
    <p>Feel free to reach out about computer architecture, operating systems, memory systems, or anything adjacent.</p>`,
};

export const aliases = {
  home: 'about',
  index: 'about',
  bio: 'about',
  whoami: 'about',
  pubs: 'publications',
  papers: 'publications',
  update: 'recent',
  updates: 'recent',
  presentation: 'presentations',
  talk: 'presentations',
  talks: 'presentations',
  blog: 'notes',
  tutorials: 'notes',
  essay: 'essays',
  musings: 'essays',
  thoughts: 'essays',
  '碎碎念': 'essays',
  '随笔': 'essays',
  mail: 'contact',
};

export const fileToPage = {
  'about': 'about',
  'about.txt': 'about',
  'publications': 'publications',
  'publications.txt': 'publications',
  'recent': 'recent',
  'recent.txt': 'recent',
  'presentations': 'presentations',
  'presentations.txt': 'presentations',
  'talks': 'presentations',
  'talks.txt': 'presentations',
  'notes': 'notes',
  'notes/': 'notes',
  'essays': 'essays',
  'essays/': 'essays',
  'essays.txt': 'essays',
  'contact': 'contact',
  'contact.txt': 'contact',
};
