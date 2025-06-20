// services/taskParser.js

function parseTaskCommand(input) {
  // Simple regex-based parser for demo (expand for production)
  const lower = input.toLowerCase();
  const gradeMatch = lower.match(/grade\s*(10|11|12)/);
  const yearMatch = lower.match(/(20\d{2})/);
  const subjectMatch = lower.match(/math|mathematics|science|english|history|geography|accounting|life science|physical science/);
  const dbeMatch = lower.match(/dbe|department of basic education/);
  const iebMatch = lower.match(/ieb|independent examinations board/);

  return {
    grade: gradeMatch ? gradeMatch[1] : undefined,
    year: yearMatch ? yearMatch[1] : undefined,
    subject: subjectMatch ? subjectMatch[0] : undefined,
    website: dbeMatch ? 'https://www.education.gov.za' : iebMatch ? 'https://www.ieb.co.za' : undefined,
    taskType: 'exam_papers',
    customQuery: input
  };
}

export { parseTaskCommand }; 