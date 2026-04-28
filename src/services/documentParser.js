import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configura o worker do PDF.js (necessário para funcionar no navegador via Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const extractTextFromFile = async (file) => {
  try {
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type === 'text/plain' || type === 'text/csv' || name.endsWith('.txt') || name.endsWith('.csv')) {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Erro ao ler arquivo de texto'));
        reader.readAsText(file);
      });
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
      
      return fullText.trim();
    } 
    else if (name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value.trim();
    } 
    else {
      throw new Error('Formato de arquivo não suportado.');
    }
  } catch (error) {
    console.error('Erro na extração de texto:', error);
    throw error;
  }
};
