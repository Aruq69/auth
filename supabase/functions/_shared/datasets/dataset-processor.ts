// Dataset processor to combine multiple CSV files into training data
export class DatasetProcessor {
  
  // Process existing email.csv (Category,Message format)
  static async processExistingDataset(): Promise<Array<{label: string, text: string}>> {
    const trainingData: Array<{label: string, text: string}> = [];
    
    try {
      const emailPath = '../_shared/datasets/email.csv';
      const emailContent = await Deno.readTextFile(emailPath);
      const emailLines = emailContent.split('\n').slice(1); // Skip header
      
      for (const line of emailLines) {
        if (!line.trim()) continue;
        
        const match = line.match(/^(ham|spam),"?([^"]*)"?$/);
        if (match) {
          const [, label, text] = match;
          trainingData.push({ label, text: text.replace(/"/g, '') });
        }
      }
      
      console.log(`Loaded ${trainingData.length} samples from existing email.csv`);
      
    } catch (error) {
      console.error('Error processing existing dataset:', error);
    }
    
    return trainingData;
  }
  
  // Process legit.csv and phishing.csv files (text,label format where label=1 means the category)
  static async processUploadedDatasets(): Promise<Array<{label: string, text: string}>> {
    const trainingData: Array<{label: string, text: string}> = [];
    
    try {
      // Process legitimate emails (legit.csv)
      const legitPath = '../_shared/datasets/legit.csv';
      const legitContent = await Deno.readTextFile(legitPath);
      const legitLines = legitContent.split('\n').slice(1); // Skip header
      
      for (const line of legitLines) {
        if (!line.trim()) continue;
        
        // Parse CSV with proper quote handling
        const csvMatch = this.parseCSVLine(line);
        if (csvMatch.length >= 2 && csvMatch[1] === '1') {
          const text = csvMatch[0].replace(/^"|"$/g, ''); // Remove surrounding quotes
          if (text.length > 20) { // Only add substantial emails
            trainingData.push({ label: 'ham', text });
          }
        }
      }
      
      // Process phishing emails (phishing.csv)
      const phishingPath = '../_shared/datasets/phishing.csv';
      const phishingContent = await Deno.readTextFile(phishingPath);
      const phishingLines = phishingContent.split('\n').slice(1); // Skip header
      
      for (const line of phishingLines) {
        if (!line.trim()) continue;
        
        const csvMatch = this.parseCSVLine(line);
        if (csvMatch.length >= 2 && csvMatch[1] === '1') {
          const text = csvMatch[0].replace(/^"|"$/g, '');
          if (text.length > 20) {
            trainingData.push({ label: 'spam', text });
          }
        }
      }
      
      // Process phishing-2.csv
      const phishing2Path = '../_shared/datasets/phishing-2.csv';
      const phishing2Content = await Deno.readTextFile(phishing2Path);
      const phishing2Lines = phishing2Content.split('\n').slice(1); // Skip header
      
      for (const line of phishing2Lines) {
        if (!line.trim()) continue;
        
        const csvMatch = this.parseCSVLine(line);
        if (csvMatch.length >= 2 && csvMatch[1] === '1') {
          const text = csvMatch[0].replace(/^"|"$/g, '');
          if (text.length > 20) {
            trainingData.push({ label: 'spam', text });
          }
        }
      }
      
      console.log(`Loaded ${trainingData.length} samples from uploaded datasets`);
      
    } catch (error) {
      console.error('Error processing uploaded datasets:', error);
    }
    
    return trainingData;
  }
  
  // Process legit-2.csv (complex format with sender,receiver,date,subject,body,urls,label)
  static async processComplexDataset(): Promise<Array<{label: string, text: string}>> {
    const trainingData: Array<{label: string, text: string}> = [];
    
    try {
      const complexPath = '../_shared/datasets/legit-2.csv';
      const complexContent = await Deno.readTextFile(complexPath);
      const complexLines = complexContent.split('\n').slice(1); // Skip header
      
      let currentEmail = '';
      let currentLabel = '';
      
      for (const line of complexLines) {
        if (!line.trim()) continue;
        
        // Parse CSV line - this is more complex due to multiline emails
        const parts = this.parseCSVLine(line);
        if (parts.length >= 7) {
          const subject = parts[3] || '';
          const body = parts[4] || '';
          const label = parts[6] === '0' ? 'ham' : 'spam';
          
          if (subject || body) {
            const text = `${subject} ${body}`.trim();
            if (text.length > 10) { // Only add substantial emails
              trainingData.push({ label, text });
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error processing complex dataset:', error);
    }
    
    return trainingData;
  }
  
  // Combine all datasets
  static async loadAllDatasets(): Promise<Array<{label: string, text: string}>> {
    const existingData = await this.processExistingDataset();
    const uploadedData = await this.processUploadedDatasets();
    const complexData = await this.processComplexDataset();
    
    const allData = [...existingData, ...uploadedData, ...complexData];
    
    console.log(`Loaded ${allData.length} total training samples`);
    console.log(`Ham emails: ${allData.filter(d => d.label === 'ham').length}`);
    console.log(`Spam emails: ${allData.filter(d => d.label === 'spam').length}`);
    
    return allData;
  }
  
  // Simple CSV parser for handling quoted fields
  private static parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }
}