import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configura o worker do PDF.js (necessário para funcionar no navegador via Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const extractTextFromFile = async (file) => {
  return new Promise(async (resolve, reject) => {
    try {
      const type = file.type;
      const name = file.name.toLowerCase();

      if (type === 'text/plain' || type === 'text/csv' || name.endsWith('.txt') || name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Erro ao ler arquivo de texto'));
        reader.readAsText(file);
      } 
      else if (type === 'application/pdf' || name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += `[Página ${i}]\n${pageText}\n\n`;
        }
        
        resolve(fullText.trim());
      } 
      else if (name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value.trim());
      } 
      else {
        reject(new Error('Formato de arquivo não suportado.'));
      }
    } catch (error) {
      console.error('Erro na extração de texto:', error);
      reject(error);
    }
  });
};
