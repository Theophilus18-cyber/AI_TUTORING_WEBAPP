# Voice Commands for Gobii Tasks - Testing Guide

## 🎤 Voice Command Integration

The LearnVerse AI Tutor now supports voice commands to automatically trigger Gobii browser tasks! Users can speak natural language commands to download exam papers, search for educational resources, and more.

## 🚀 How to Test

### 1. Start Both Servers

**Backend (Terminal 1):**
```bash
cd learn-verse-backend
npm start
```

**Frontend (Terminal 2):**
```bash
cd learn-verse-ai-tutor-main
npm run dev
```

### 2. Voice Command Examples

Click the microphone button in the bottom-right corner and try these voice commands:

#### 📚 Download Exam Papers
- **"Download past papers for grade 12 mathematics"**
- **"Download exam papers for grade 11 English 2023"**
- **"Get past papers for grade 10 science"**

#### 🔍 Search Educational Resources
- **"Search for mathematics resources"**
- **"Find educational materials about physics"**
- **"Look for chemistry teaching content"**

#### 🎯 Advanced Commands
- **"Download grade 12 accounting past papers from 2022"**
- **"Search for biology study materials"**
- **"Get mathematics question papers for grade 11"**

## 🎯 Supported Voice Patterns

The system automatically detects these patterns:

### Exam Papers Pattern
```
download + (past papers|exam papers|question papers) + grade + (10|11|12) + subject
```

**Examples:**
- "download past papers for grade 12 mathematics"
- "get exam papers grade 11 English"
- "download question papers grade 10 science"

### Year-Specific Pattern
```
download + (past papers|exam papers|question papers) + year + subject
```

**Examples:**
- "download past papers 2023 mathematics"
- "get exam papers 2022 English"

### Resource Search Pattern
```
search + (for|about) + subject + (resources|materials|content)
```

**Examples:**
- "search for mathematics resources"
- "search about physics materials"

## 🎨 Visual Feedback

When you speak a voice command:

1. **Listening State**: Microphone button pulses red
2. **Task Detection**: System automatically detects task commands
3. **Task Execution**: Button changes to orange with globe icon
4. **Status Updates**: Real-time status messages appear
5. **Completion**: Success/failure messages with results

## 🔧 Technical Details

### Frontend Integration
- **File**: `src/components/VapiVoiceAssistant.tsx`
- **Pattern Detection**: Regex-based command parsing
- **Task Triggering**: Automatic API calls to backend
- **UI Feedback**: Real-time status updates

### Backend Integration
- **API Endpoint**: `POST /api/tasks/perform`
- **Gobii Service**: Browser automation for downloads
- **Task Parser**: Natural language to structured parameters
- **Error Handling**: Comprehensive error reporting

### Supported Subjects
- Mathematics
- English
- Science
- Physics
- Chemistry
- Biology
- History
- Geography
- Economics
- Accounting

## 🐛 Troubleshooting

### Voice Not Working
1. Check microphone permissions
2. Ensure Vapi API key is valid
3. Verify internet connection

### Tasks Not Triggering
1. Check backend server is running
2. Verify Gobii API key is set
3. Check browser console for errors

### Downloads Not Working
1. Verify target website is accessible
2. Check Gobii service logs
3. Ensure proper file permissions

## 🎯 Testing Checklist

- [ ] Voice assistant starts listening
- [ ] Command detection works
- [ ] Task parameters are extracted correctly
- [ ] Backend receives task request
- [ ] Gobii browser automation works
- [ ] Downloads are successful
- [ ] Status updates appear in UI
- [ ] Error handling works properly

## 🚀 Next Steps

1. **Test all voice command patterns**
2. **Verify downloads work correctly**
3. **Check error handling scenarios**
4. **Test with different subjects and grades**
5. **Verify real-time status updates**

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Review backend server logs
3. Verify all API keys are configured
4. Test with simple commands first

---

**Happy Testing! 🎤✨** 