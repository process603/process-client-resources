/** Public resource feed for the Process Client Resource Hub.
 * Bind this project to the staff Sheet. Deploy only after the public feed is approved.
 * Never add client information to this Sheet.
 */
function doGet(e) {
  const payload = buildPublicResources_();
  const callback = String((e && e.parameter && e.parameter.callback) || '');
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  if (callback) {
    if (!/^__processFeed_[A-Za-z0-9_]{5,50}$/.test(callback)) {
      return ContentService.createTextOutput('Invalid callback');
    }
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function buildPublicResources_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = book.getSheetByName('Resources');
  if (!sheet) throw new Error('Resources tab missing');
  const data = sheet.getDataRange().getValues();
  const display = sheet.getDataRange().getDisplayValues();
  const headers = data[1].map(x => String(x).trim());
  const required = ['Category','Resource Name','Description','Button Text','URL','Phone','How-To','Audience','Featured','Active','Sort Order','Last Verified','Important Notes','Map Type','Address','Latitude','Longitude'];
  const columns = Object.fromEntries(required.map(name => [name, headers.indexOf(name)]));
  if (required.some(name => columns[name] < 0)) throw new Error('Resources columns missing');
  const categorySheet = book.getSheetByName('Categories');
  if (!categorySheet) throw new Error('Categories tab missing');
  const categoryRows = categorySheet.getLastRow() >= 3
    ? categorySheet.getRange(3, 1, categorySheet.getLastRow() - 2, 4).getValues() : [];
  const categories = categoryRows.filter(row => row[3] === true && String(row[0]).trim())
    .map(row => ({ name: String(row[0]).trim(), description: String(row[1] || '').trim(), sortOrder: Number(row[2]) || 999 }))
    .sort((a,b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const allowed = new Set(categories.map(category => category.name));
  const items = [];
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    const get = name => String(display[i][columns[name]] || '').trim();
    const title = get('Resource Name');
    const category = get('Category');
    if (!title || row[columns.Active] !== true || !allowed.has(category)) continue;
    const audience = get('Audience');
    if (!['All','Men','Women'].includes(audience)) continue;
    const link = get('URL');
    if (link && !/^https?:\/\//i.test(link)) continue;
    items.push({
      category,
      title,
      description: get('Description'),
      buttonText: get('Button Text') || 'Open resource',
      url: link,
      phone: get('Phone'),
      howTo: get('How-To'),
      audience,
      featured: row[columns.Featured] === true,
      sortOrder: Number(row[columns['Sort Order']]) || 999,
      lastVerified: get('Last Verified'),
      importantNotes: get('Important Notes'),
      mapType: get('Map Type'),
      address: get('Address'),
      latitude: get('Latitude'),
      longitude: get('Longitude')
      // Staff Notes is deliberately excluded.
    });
  }
  return { updatedAt: new Date().toISOString(), categories, resources: items };
}
