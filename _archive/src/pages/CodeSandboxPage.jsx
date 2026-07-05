import React, { useState, useRef } from 'react';
import './CodeSandboxPage.css';

const CodeSandboxPage = () => {
  const [code, setCode] = useState(`// Exemplo de Script PicoClaw (Go/Node)
function helloNebula() {
  console.log("🚀 Inicializando motor PicoClaw...");
  console.log("✅ Conexão estabelecida com sucesso.");
  return "Nebula está online!";
}

helloNebula();`);

  const [output, setOutput] = useState([
    { type: 'system', text: 'PicoClaw Sandbox v0.5.1 ready.' },
    { type: 'system', text: 'Waiting for execution command...' }
  ]);
  
  const [isRunning, setIsRunning] = useState(false);
  const [language, setLanguage] = useState('javascript');

  const runCode = () => {
    setIsRunning(true);
    const newOutput = [...output, { type: 'command', text: `> Running ${language} engine...` }];
    setOutput(newOutput);

    // Simulação de execução
    setTimeout(() => {
      setOutput(prev => [
        ...prev,
        { type: 'stdout', text: '🚀 Inicializando motor PicoClaw...' },
        { type: 'stdout', text: '✅ Conexão estabelecida com sucesso.' },
        { type: 'result', text: 'Return: "Nebula está online!"' }
      ]);
      setIsRunning(false);
    }, 1500);
  };

  const clearConsole = () => setOutput([{ type: 'system', text: 'Console cleared.' }]);

  return (
    <div className="sandbox-page fade-in">
      <header className="sandbox-header">
        <div className="header-left">
          <h1>Nebula Sandbox</h1>
          <p>Ambiente de execução segura provido pelo PicoClaw Full-Stack Engine.</p>
        </div>
        <div className="header-actions">
          <select 
            className="lang-select glass" 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="javascript">JavaScript (Node.js)</option>
            <option value="python">Python 3.11</option>
            <option value="go">Go 1.21</option>
            <option value="bash">Bash Script</option>
          </select>
          <button 
            className={`btn-run ${isRunning ? 'running' : ''}`} 
            onClick={runCode}
            disabled={isRunning}
          >
            {isRunning ? 'Executando...' : 'Executar Código ⚡'}
          </button>
        </div>
      </header>

      <div className="sandbox-main">
        <div className="editor-container glass">
          <div className="editor-header">
            <div className="dots">
              <span></span><span></span><span></span>
            </div>
            <span className="file-name">main.{language === 'javascript' ? 'js' : language === 'python' ? 'py' : language === 'go' ? 'go' : 'sh'}</span>
          </div>
          <textarea 
            className="code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
          />
        </div>

        <div className="terminal-container glass">
          <div className="terminal-header">
            <span>Terminal Output</span>
            <button className="btn-clear" onClick={clearConsole}>Limpar</button>
          </div>
          <div className="terminal-body">
            {output.map((line, i) => (
              <div key={i} className={`terminal-line ${line.type}`}>
                {line.type === 'command' && <span className="prompt">$</span>}
                {line.text}
              </div>
            ))}
            {isRunning && <div className="terminal-line system blinking">_</div>}
          </div>
        </div>
      </div>

      <footer className="sandbox-footer">
        <div className="engine-status">
          <span className="status-dot"></span>
          Motor PicoClaw: <strong>Otimizado</strong>
        </div>
        <div className="resource-usage">
          <span>CPU: 2%</span>
          <span>MEM: 24MB</span>
          <span>TIMEOUT: 30s</span>
        </div>
      </footer>
    </div>
  );
};

export default CodeSandboxPage;
