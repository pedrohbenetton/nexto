function cleanStopAddress(rawAddress, linePath, index, totalStops) {
  if (!rawAddress || typeof rawAddress !== 'string') {
    rawAddress = '';
  }

  let addr = rawAddress.trim();

  // 1. Remove tags HTML residuais
  addr = addr.replace(/<[^>]+>/g, '').trim();

  // 2. Remove prefixos de código operacional da empresa (ex: "0169 - ")
  addr = addr.replace(/^\d{3,5}\s*-\s*/, '').trim();

  // 3. Normalização de paradas sem nome / "Unnamed Road"
  const lower = addr.toLowerCase();
  const lowerPath = (linePath || '').toLowerCase();
  if (!addr || lower.includes('unnamed road') || lower.includes('sem nome') || lower === 'sorocaba - sp, brasil') {
    if (lowerPath.includes('ufscar') || lowerPath.includes('universidade')) {
      addr = 'UFSCar - Campus Sorocaba (Terminal Universitário)';
    } else if (index === 0) {
      addr = 'Terminal / Estação de Origem';
    } else if (index === totalStops - 1) {
      addr = 'Terminal / Estação de Destino';
    } else {
      addr = `Parada de Embarque #${index + 1}`;
    }
  }

  // 4. Correção de nomenclaturas específicas do viário de Sorocaba
  // SP-079 em Sorocaba é a Av. Dr. Armando Pannunzio ou General Carneiro
  addr = addr.replace(/SP-079,\s*1970/i, 'Av. Dr. Armando Pannunzio, 1970');
  addr = addr.replace(/SP-079,\s*825-901/i, 'Av. Dr. Armando Pannunzio, 825-901');
  addr = addr.replace(/SP-079,\s*319/i, 'Av. Dr. Armando Pannunzio, 319');
  addr = addr.replace(/SP-079,\s*2171/i, 'Av. General Carneiro, 2171');
  addr = addr.replace(/\bSP-079\b/i, 'Rod. João Leme dos Santos (SP-079)');

  // Normalização de abreviações comuns
  addr = addr.replace(/\bAv\.\s*Gen\.\s*/i, 'Av. General ');
  addr = addr.replace(/\bAv\.\s*Gal\.\s*/i, 'Av. General ');
  addr = addr.replace(/\bAv\.\s*Pres\.\s*/i, 'Av. Presidente ');
  addr = addr.replace(/\bRod\.\s*/i, 'Rodovia ');
  addr = addr.replace(/\b,\s*sn\b/i, ' (s/nº)');
  addr = addr.replace(/\bnº\s*/i, '');

  // Limpeza de pontuação duplicada
  addr = addr.replace(/,{2,}/g, ',');

  // 5. Limpeza de sufixos de CEP, País e redundâncias
  addr = addr.replace(/,\s*\d{5}-?\d{3}/g, '');
  addr = addr.replace(/,\s*Brasil$/i, '');
  addr = addr.replace(/,\s*São Paulo$/i, '');

  return addr.trim();
}

const samples = [
  'Unnamed Road, Sorocaba - SP, Brasil',
  '0169 - General Carneiro, 140 - Vila Santa Terezinha, Sorocaba - SP, 18035-002, Brasil',
  'Av. Gal. Carneiro, nº 1623. - Vila Sao Caetano, Sorocaba - SP, 18055-127, Brasil',
  'Av. Dr. Armando Pannunzio, sn - Jardim Piazza Di Roma, Sorocaba - SP, 18051-735, Brasil',
  'SP-079, 1970 - Jardim Piazza Di Roma, Sorocaba - SP, 18050-000, Brasil',
  'Rua Alice Cintra Borman 16, Votorantim - São Paulo,, Brasil',
  'Praça Pres. Tancredo Neves, 87-107 - Centro, Sorocaba - SP, Brasil'
];

samples.forEach(s => {
  console.log(`Original: "${s}"`);
  console.log(`Cleaned:  "${cleanStopAddress(s, '80-ufscar', 0, 35)}"\n`);
});
