/**
 * GOOGLE APPS SCRIPT DATABASE CONTROLLER - IC3 GS6 EXAM PREP
 * 
 * HƯỚNG DẪN THIẾT LẬP GOOGLE SHEET LÀM DATABASE:
 * 
 * Bước 1: Tạo một Google Sheet mới.
 * Bước 2: Tạo các Sheet (tab) trống với tên chính xác như sau:
 *   - "Admin" (Cột: AdminID, Username, Password, Role)
 *   - "Student" (Cột: StudentID, SchoolName, Username, Password, FullName, ClassGroup, CreatedAt)
 *   - "Questions" (Cột: QuestionID, ExamID, Level, QuestionType, QuestionContent, Answers, CorrectAnswer, Explanation, Image, Video, Audio, Score, CreatedAt)
 *   - "Score" (Cột: StudentID, StudentName, SchoolName, ClassGroup, ExamID, Level, Score, Correct, Wrong, Time, SubmitTime)
 * Bước 3: Vào Tiện ích mở rộng (Extensions) -> Apps Script.
 * Bước 4: Xóa toàn bộ mã mặc định và dán toàn bộ đoạn code dưới đây vào.
 * Bước 5: Nhấn Lưu (Save) rồi nhấn "Triển khai" (Deploy) -> "Triển khai mới" (New deployment).
 *   - Chọn loại: Ứng dụng khách Web (Web App).
 *   - Cấu hình: 
 *     + Chạy dưới cấu quyền của bạn (Execute as: Me - địa chỉ email của bạn).
 *     + Ai có quyền truy cập (Who has access): Mọi người (Anyone - kể cả ẩn danh).
 *   - Nhấn Triển khai và sao chép URL của Web App (có đuôi /exec).
 * Bước 6: Dán URL Web App này vào ô "Cấu hình Google Sheets" trên Website ôn tập để đồng bộ 2 chiều!
 */

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    if (!action) {
      return createResponse({ success: false, message: "Thiếu tham số action." });
    }
    
    // 1. LẤY TOÀN BỘ DANH SÁCH SHEET ĐỀ THI (CÓ DẠNG LVx_OTy) VÀ LEVEL
    if (action === "getExams") {
      var sheets = ss.getSheets();
      var exams = [];
      for (var i = 0; i < sheets.length; i++) {
        var sheetName = sheets[i].getName();
        if (sheetName.indexOf("LV1_") === 0 || sheetName.indexOf("LV2_") === 0 || sheetName.indexOf("LV3_") === 0) {
          var parts = sheetName.split("_");
          var level = parts[0];
          var examId = parts[1];
          var questionIds = getColumnValues(sheets[i], "QuestionID");
          exams.push({
            ExamID: examId,
            Level: level,
            QuestionIDs: questionIds
          });
        }
      }
      return createResponse({ success: true, data: exams });
    }
    
    // 2. LẤY TOÀN BỘ DỮ LIỆU TỪ MỘT TABLE (Admin, Student, Questions, Score)
    if (action === "getTable") {
      var tableName = e.parameter.table;
      if (!tableName) {
        return createResponse({ success: false, message: "Thiếu tên bảng (table)." });
      }
      var sheet = ss.getSheetByName(tableName);
      if (!sheet) {
        return createResponse({ success: false, message: "Bảng '" + tableName + "' không tồn tại." });
      }
      var data = readSheetData(sheet);
      return createResponse({ success: true, data: data });
    }
    
    // 3. KIỂM TRA ĐĂNG NHẬP (HỖ TRỢ DROPDOWN CHO HỌC SINH)
    if (action === "login") {
      var username = e.parameter.username;
      var password = e.parameter.password;
      var role = e.parameter.role; // "Admin" hoặc "Student"
      
      var schoolName = e.parameter.schoolName;
      var classGroup = e.parameter.classGroup;
      var fullName = e.parameter.fullName;
      
      if (role === "Admin") {
        var adminSheet = ss.getSheetByName("Admin");
        var admins = readSheetData(adminSheet);
        var foundAdmin = admins.find(function(a) { 
          return String(getProp(a, "Username")).trim() === String(username).trim() && 
                 String(getProp(a, "Password")).trim() === String(password).trim(); 
        });
        if (foundAdmin) {
          return createResponse({ success: true, role: "Admin", user: foundAdmin });
        }
      } else {
        var studentSheet = ss.getSheetByName("Student");
        var students = readSheetData(studentSheet);
        var foundStudent;
        if (schoolName && classGroup && fullName) {
          foundStudent = students.find(function(s) {
            return String(getProp(s, "SchoolName")).trim() === String(schoolName).trim() && 
                   String(getProp(s, "ClassGroup")).trim() === String(classGroup).trim() && 
                   String(getProp(s, "FullName")).trim() === String(fullName).trim() && 
                   String(getProp(s, "Password")).trim() === String(password).trim();
          });
        } else {
          foundStudent = students.find(function(s) { 
            return String(getProp(s, "Username")).trim() === String(username).trim() && 
                   String(getProp(s, "Password")).trim() === String(password).trim(); 
          });
        }
        if (foundStudent) {
          return createResponse({ success: true, role: "Student", user: foundStudent });
        }
      }
      return createResponse({ success: false, message: "Thông tin đăng nhập hoặc mật khẩu không chính xác." });
    }
    
    return createResponse({ success: false, message: "Action doGet không hợp lệ: " + action });
    
  } catch (err) {
    return createResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    var postData;
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    } else {
      return createResponse({ success: false, message: "Thiếu dữ liệu POST body." });
    }
    
    var action = postData.action;
    if (!action) {
      return createResponse({ success: false, message: "Thiếu tham số action trong body." });
    }
    
    // ==========================================
    // 1. QUẢN LÝ ĐỀ THI (THÊM, ĐỔI TÊN, DI CHUYỂN, SAO CHÉP, XÓA)
    // ==========================================
    
    if (action === "createExam") {
      var level = postData.level; // "LV1", "LV2", "LV3"
      var examId = postData.examId; // "OT5"
      var sheetName = level + "_" + examId;
      
      if (ss.getSheetByName(sheetName)) {
        return createResponse({ success: false, message: "Đề thi đã tồn tại Sheet: " + sheetName });
      }
      
      var newSheet = ss.insertSheet(sheetName);
      newSheet.appendRow(["QuestionID"]); // Header
      return createResponse({ success: true, message: "Tạo đề " + sheetName + " thành công." });
    }
    
    if (action === "renameExam") {
      var oldLevel = postData.oldLevel;
      var oldExamId = postData.oldExamId;
      var newExamId = postData.newExamId;
      var currentLevel = postData.currentLevel || oldLevel;
      
      var oldSheetName = oldLevel + "_" + oldExamId;
      var newSheetName = currentLevel + "_" + newExamId;
      
      var sheet = ss.getSheetByName(oldSheetName);
      if (!sheet) {
        return createResponse({ success: false, message: "Không tìm thấy đề thi cần đổi tên: " + oldSheetName });
      }
      if (ss.getSheetByName(newSheetName)) {
        return createResponse({ success: false, message: "Tên đề mới đã tồn tại trên Sheet: " + newSheetName });
      }
      
      sheet.setName(newSheetName);
      
      // Đồng thời cập nhật trường ExamID và Level của các câu hỏi thuộc đề này trong bảng Questions
      var questionsSheet = ss.getSheetByName("Questions");
      if (questionsSheet) {
        var qData = readSheetData(questionsSheet);
        for (var i = 0; i < qData.length; i++) {
          if (qData[i].ExamID === oldExamId && qData[i].Level === oldLevel) {
            var rowNum = i + 2; // +2 vì dòng đầu là header, chỉ số bắt đầu từ 0
            updateCell(questionsSheet, rowNum, "ExamID", newExamId);
            updateCell(questionsSheet, rowNum, "Level", currentLevel);
          }
        }
      }
      return createResponse({ success: true, message: "Đổi tên đề thành " + newSheetName + " thành công." });
    }
    
    if (action === "moveExam") {
      var examId = postData.examId;
      var oldLevel = postData.oldLevel;
      var newLevel = postData.newLevel;
      
      var oldSheetName = oldLevel + "_" + examId;
      var newSheetName = newLevel + "_" + examId;
      
      var sheet = ss.getSheetByName(oldSheetName);
      if (!sheet) {
        return createResponse({ success: false, message: "Không tìm thấy đề " + oldSheetName });
      }
      if (ss.getSheetByName(newSheetName)) {
        return createResponse({ success: false, message: "Đề đã tồn tại ở Level mới: " + newSheetName });
      }
      
      sheet.setName(newSheetName);
      
      // Cập nhật Questions table
      var questionsSheet = ss.getSheetByName("Questions");
      if (questionsSheet) {
        var qData = readSheetData(questionsSheet);
        for (var i = 0; i < qData.length; i++) {
          if (qData[i].ExamID === examId && qData[i].Level === oldLevel) {
            updateCell(questionsSheet, i + 2, "Level", newLevel);
          }
        }
      }
      return createResponse({ success: true, message: "Di chuyển đề thành công sang Level mới." });
    }
    
    if (action === "copyExam") {
      var sourceLevel = postData.sourceLevel;
      var sourceExamId = postData.sourceExamId;
      var targetLevel = postData.targetLevel;
      var targetExamId = postData.targetExamId;
      
      var sourceSheetName = sourceLevel + "_" + sourceExamId;
      var targetSheetName = targetLevel + "_" + targetExamId;
      
      var sourceSheet = ss.getSheetByName(sourceSheetName);
      if (!sourceSheet) {
        return createResponse({ success: false, message: "Không tìm thấy đề nguồn: " + sourceSheetName });
      }
      if (ss.getSheetByName(targetSheetName)) {
        return createResponse({ success: false, message: "Đề đích đã tồn tại: " + targetSheetName });
      }
      
      var copiedSheet = sourceSheet.copyTo(ss);
      copiedSheet.setName(targetSheetName);
      
      // Sao chép các câu hỏi trong bảng Questions từ đề nguồn sang đề đích với ID mới sinh ra
      var questionsSheet = ss.getSheetByName("Questions");
      if (questionsSheet) {
        var qData = readSheetData(questionsSheet);
        var sourceQuestionIDs = getColumnValues(sourceSheet, "QuestionID");
        
        var nextQIdNum = qData.length + 1;
        var newQIDs = [];
        
        for (var j = 0; j < qData.length; j++) {
          var q = qData[j];
          if (sourceQuestionIDs.indexOf(q.QuestionID) !== -1) {
            var newQId = "Q" + padZero(nextQIdNum++, 3);
            newQIDs.push(newQId);
            
            // Append một dòng câu hỏi mới
            var newRow = [
              newQId,
              targetExamId,
              targetLevel,
              q.QuestionType,
              q.QuestionContent,
              q.Answers,
              q.CorrectAnswer,
              q.Explanation,
              q.Image || "",
              q.Video || "",
              q.Audio || "",
              q.Score || 10,
              new Date().toISOString()
            ];
            questionsSheet.appendRow(newRow);
          }
        }
        
        // Ghi lại danh sách QuestionID mới vào Sheet vừa nhân bản
        copiedSheet.clear();
        copiedSheet.appendRow(["QuestionID"]);
        for (var k = 0; k < newQIDs.length; k++) {
          copiedSheet.appendRow([newQIDs[k]]);
        }
      }
      
      return createResponse({ success: true, message: "Sao chép đề thi thành công!" });
    }
    
    if (action === "deleteExam") {
      var level = postData.level;
      var examId = postData.examId;
      var sheetName = level + "_" + examId;
      
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        return createResponse({ success: false, message: "Đề thi không tồn tại: " + sheetName });
      }
      
      ss.deleteSheet(sheet);
      
      // Lựa chọn: Xóa cả câu hỏi thuộc đề này trong Questions để dọn rác dọn sạch hệ thống
      var questionsSheet = ss.getSheetByName("Questions");
      if (questionsSheet) {
        var qData = readSheetData(questionsSheet);
        // Duyệt ngược để tránh lệch chỉ số khi xóa dòng
        for (var i = qData.length - 1; i >= 0; i--) {
          if (qData[i].ExamID === examId && qData[i].Level === level) {
            questionsSheet.deleteRow(i + 2);
          }
        }
      }
      return createResponse({ success: true, message: "Đã xóa đề thi " + sheetName + " và các câu hỏi liên quan." });
    }
    
    // ==========================================
    // 2. QUẢN LÝ CÂU HỎI (CRUD QUESTIONS)
    // ==========================================
    
    if (action === "saveQuestion") {
      var questionsSheet = ss.getSheetByName("Questions");
      if (!questionsSheet) {
        return createResponse({ success: false, message: "Không có bảng Questions." });
      }
      
      var q = postData.question;
      var qData = readSheetData(questionsSheet);
      var existingIndex = qData.findIndex(function(item) { return item.QuestionID === q.QuestionID; });
      
      var rowValues = [
        q.QuestionID,
        q.ExamID,
        q.Level,
        q.QuestionType,
        q.QuestionContent,
        q.Answers,
        q.CorrectAnswer,
        q.Explanation,
        q.Image || "",
        q.Video || "",
        q.Audio || "",
        q.Score || 10,
        q.CreatedAt || new Date().toISOString()
      ];
      
      if (existingIndex !== -1) {
        // Update câu hỏi
        var rowNum = existingIndex + 2;
        var headers = getHeaders(questionsSheet);
        for (var c = 0; c < headers.length; c++) {
          var key = headers[c];
          var val = q[key] !== undefined ? q[key] : (rowValues[c] || "");
          // Nếu Answers hoặc CorrectAnswer là object/mảng, giữ dạng string
          if (typeof val === 'object') {
            val = JSON.stringify(val);
          }
          var colNum = c + 1;
          questionsSheet.getRange(rowNum, colNum).setValue(val);
        }
        
        // Kiểm tra xem đề của câu hỏi có khớp với Sheet chứa ID hay chưa
        var examSheetName = q.Level + "_" + q.ExamID;
        var examSheet = ss.getSheetByName(examSheetName);
        if (examSheet) {
          var examQIDs = getColumnValues(examSheet, "QuestionID");
          if (examQIDs.indexOf(q.QuestionID) === -1) {
            examSheet.appendRow([q.QuestionID]);
          }
        }
        
        return createResponse({ success: true, message: "Cập nhật câu hỏi thành công.", questionId: q.QuestionID });
      } else {
        // Thêm câu hỏi mới
        questionsSheet.appendRow(rowValues);
        
        // Thêm QuestionID vào đề tương ứng
        var examSheetName = q.Level + "_" + q.ExamID;
        var examSheet = ss.getSheetByName(examSheetName);
        if (examSheet) {
          examSheet.appendRow([q.QuestionID]);
        }
        
        return createResponse({ success: true, message: "Thêm câu hỏi mới thành công.", questionId: q.QuestionID });
      }
    }
    
    if (action === "deleteQuestion") {
      var qId = postData.questionId;
      var questionsSheet = ss.getSheetByName("Questions");
      if (!questionsSheet) {
        return createResponse({ success: false, message: "Không tìm thấy bảng Questions." });
      }
      
      var qData = readSheetData(questionsSheet);
      var idx = qData.findIndex(function(item) { return item.QuestionID === qId; });
      
      if (idx !== -1) {
        var question = qData[idx];
        questionsSheet.deleteRow(idx + 2);
        
        // Xóa ID câu hỏi trong đề thi của nó
        var examSheetName = question.Level + "_" + question.ExamID;
        var examSheet = ss.getSheetByName(examSheetName);
        if (examSheet) {
          var qIds = getColumnValues(examSheet, "QuestionID");
          var qIdx = qIds.indexOf(qId);
          if (qIdx !== -1) {
            examSheet.deleteRow(qIdx + 2); // +2 vì header
          }
        }
        return createResponse({ success: true, message: "Xóa câu hỏi thành công!" });
      }
      return createResponse({ success: false, message: "Câu hỏi không tồn tại để xóa." });
    }
    
    // ==========================================
    // 3. QUẢN LÝ HỌC SINH (CRUD STUDENT)
    // ==========================================
    
    if (action === "saveStudent") {
      var studentSheet = ss.getSheetByName("Student");
      if (!studentSheet) {
        return createResponse({ success: false, message: "Không tìm thấy bảng Student." });
      }
      
      var student = postData.student;
      var students = readSheetData(studentSheet);
      var existingIdx = students.findIndex(function(s) { return s.StudentID === student.StudentID; });
      
      if (existingIdx !== -1) {
        var rowNum = existingIdx + 2;
        var headers = getHeaders(studentSheet);
        for (var c = 0; c < headers.length; c++) {
          var key = headers[c];
          var val = student[key] !== undefined ? student[key] : "";
          studentSheet.getRange(rowNum, c + 1).setValue(val);
        }
        return createResponse({ success: true, message: "Cập nhật học sinh thành công." });
      } else {
        // Thêm học sinh mới
        var row = [
          student.StudentID,
          student.SchoolName || "",
          student.Username,
          student.Password,
          student.FullName,
          student.ClassGroup,
          student.CreatedAt || new Date().toISOString()
        ];
        studentSheet.appendRow(row);
        return createResponse({ success: true, message: "Thêm học sinh mới thành công." });
      }
    }
    
    if (action === "deleteStudent") {
      var sId = postData.studentId;
      var studentSheet = ss.getSheetByName("Student");
      if (!studentSheet) return createResponse({ success: false, message: "Không tìm thấy bảng Student." });
      
      var students = readSheetData(studentSheet);
      var idx = students.findIndex(function(s) { return s.StudentID === sId; });
      
      if (idx !== -1) {
        studentSheet.deleteRow(idx + 2);
        
        // Đồng thời dọn lịch sử điểm của học sinh này trên bảng Score
        var scoreSheet = ss.getSheetByName("Score");
        if (scoreSheet) {
          var scores = readSheetData(scoreSheet);
          for (var i = scores.length - 1; i >= 0; i--) {
            if (scores[i].StudentID === sId) {
              scoreSheet.deleteRow(i + 2);
            }
          }
        }
        return createResponse({ success: true, message: "Xóa học sinh thành công." });
      }
      return createResponse({ success: false, message: "Học sinh không tồn tại." });
    }
    
    // ==========================================
    // 4. LƯU LỊCH SỬ LÀM BÀI (SCORE SAVER)
    // ==========================================
    
    if (action === "submitScore") {
      var scoreSheet = ss.getSheetByName("Score");
      if (!scoreSheet) {
        return createResponse({ success: false, message: "Không tìm thấy bảng Score trên Google Sheets." });
      }
      
      var scoreRec = postData.scoreRecord;
      if (!scoreRec) {
        return createResponse({ success: false, message: "Lưu kết quả thất bại: Thiếu thông tin scoreRecord." });
      }

      // Hỗ trợ linh hoạt cả PascalCase và camelCase
      var studentId = getProp(scoreRec, "StudentID") || getProp(scoreRec, "studentId");
      var studentName = getProp(scoreRec, "StudentName") || getProp(scoreRec, "studentName");
      var schoolName = getProp(scoreRec, "SchoolName") || getProp(scoreRec, "schoolName");
      var classGroup = getProp(scoreRec, "ClassGroup") || getProp(scoreRec, "classGroup");
      var examId = getProp(scoreRec, "ExamID") || getProp(scoreRec, "examId");
      var level = getProp(scoreRec, "Level") || getProp(scoreRec, "level");
      
      var scoreVal = getProp(scoreRec, "Score");
      if (scoreVal === undefined || scoreVal === null || scoreVal === "") {
        scoreVal = getProp(scoreRec, "score");
      }
      var correctVal = getProp(scoreRec, "Correct");
      if (correctVal === undefined || correctVal === null || correctVal === "") {
        correctVal = getProp(scoreRec, "correct");
      }
      var wrongVal = getProp(scoreRec, "Wrong");
      if (wrongVal === undefined || wrongVal === null || wrongVal === "") {
        wrongVal = getProp(scoreRec, "wrong");
      }
      var timeVal = getProp(scoreRec, "Time");
      if (timeVal === undefined || timeVal === null || timeVal === "") {
        timeVal = getProp(scoreRec, "time");
      }
      var submitTimeVal = getProp(scoreRec, "SubmitTime") || getProp(scoreRec, "submitTime") || new Date().toISOString();

      // Kiểm tra đầy đủ các trường bắt buộc (Không ghi dữ liệu và trả về thông báo lỗi nếu thiếu trường nào)
      var missingFields = [];
      if (studentId === undefined || studentId === null || studentId === "") missingFields.push("studentId/StudentID");
      if (studentName === undefined || studentName === null || studentName === "") missingFields.push("studentName/StudentName");
      if (schoolName === undefined || schoolName === null || schoolName === "") missingFields.push("schoolName/SchoolName");
      if (classGroup === undefined || classGroup === null || classGroup === "") missingFields.push("classGroup/ClassGroup");
      if (examId === undefined || examId === null || examId === "") missingFields.push("examId/ExamID");
      if (level === undefined || level === null || level === "") missingFields.push("level/Level");
      if (scoreVal === undefined || scoreVal === null || scoreVal === "") missingFields.push("score/Score");
      if (correctVal === undefined || correctVal === null || correctVal === "") missingFields.push("correct/Correct");
      if (wrongVal === undefined || wrongVal === null || wrongVal === "") missingFields.push("wrong/Wrong");
      if (timeVal === undefined || timeVal === null || timeVal === "") missingFields.push("time/Time");
      if (submitTimeVal === undefined || submitTimeVal === null || submitTimeVal === "") missingFields.push("submitTime/SubmitTime");

      if (missingFields.length > 0) {
        return createResponse({ 
          success: false, 
          message: "Lưu kết quả thất bại do thiếu các trường bắt buộc: " + missingFields.join(", ") 
        });
      }

      var mappedObj = {
        StudentID: studentId,
        StudentName: studentName,
        SchoolName: schoolName,
        ClassGroup: classGroup,
        ExamID: examId,
        Level: level,
        Score: Number(scoreVal),
        Correct: Number(correctVal),
        Wrong: Number(wrongVal),
        Time: Number(timeVal),
        SubmitTime: submitTimeVal
      };

      // 4. Mảng ghi xuống sheet (đúng thứ tự 11 cột chuẩn)
      var row = [
        mappedObj.StudentID,
        mappedObj.StudentName,
        mappedObj.SchoolName,
        mappedObj.ClassGroup,
        mappedObj.ExamID,
        mappedObj.Level,
        mappedObj.Score,
        mappedObj.Correct,
        mappedObj.Wrong,
        mappedObj.Time,
        mappedObj.SubmitTime
      ];

      // 6. Thêm log debug chi tiết
      console.log("SubmitScore Payload nhận được: " + JSON.stringify(postData));
      console.log("SubmitScore Object sau mapping: " + JSON.stringify(mappedObj));
      console.log("SubmitScore Mảng ghi xuống sheet: " + JSON.stringify(row));

      scoreSheet.appendRow(row);
      return createResponse({ success: true, message: "Đã lưu lịch sử làm bài lên Google Sheets!" });
    }
    
    return createResponse({ success: false, message: "Action doPost không hợp lệ: " + action });
    
  } catch (err) {
    return createResponse({ success: false, error: err.toString() });
  }
}

// ==========================================
// CÁC HÀM TRỢ GIÚP TIỆN ÍCH (HELPERS)
// ==========================================

function createResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// Xử lý phương thức OPTIONS phục vụ CORS Preflight trong trình duyệt
function doOptions(e) {
  var output = ContentService.createTextOutput("");
  output.setMimeType(ContentService.MimeType.TEXT);
  return output;
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function readSheetData(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  var headers = getHeaders(sheet);
  var dataValues = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  
  var result = [];
  for (var r = 0; r < dataValues.length; r++) {
    var row = dataValues[r];
    var item = {};
    for (var c = 0; c < headers.length; c++) {
      var headerKey = normalizeHeaderKey(headers[c]);
      var val = row[c];
      // Nếu là Date, đổi về ISO string
      if (val instanceof Date) {
        val = val.toISOString();
      }
      item[headerKey] = val;
    }
    result.push(item);
  }
  return result;
}

function getProp(obj, targetKey) {
  if (!obj) return "";
  var targetLower = targetKey.toLowerCase().replace(/\s/g, "");
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      var keyLower = key.toLowerCase().replace(/\s/g, "");
      if (keyLower === targetLower) {
        return obj[key];
      }
    }
  }
  return "";
}

function normalizeHeaderKey(key) {
  if (!key) return "";
  var k = key.toString().trim().toLowerCase().replace(/\s/g, "").replace(/_/g, "");
  
  // Mapping for Admin
  if (k === "adminid" || k === "id" || k === "maadmin") return "AdminID";
  if (k === "username" || k === "user" || k === "taikhoan" || k === "tendangnhap") return "Username";
  if (k === "password" || k === "pass" || k === "matkhau") return "Password";
  if (k === "role" || k === "vaitro") return "Role";
  
  // Mapping for Student
  if (k === "studentid" || k === "student_id" || k === "mahocsinh" || k === "masinhvien") return "StudentID";
  if (k === "schoolname" || k === "school" || k === "truong" || k === "tentruong") return "SchoolName";
  if (k === "fullname" || k === "name" || k === "hoten" || k === "ten") return "FullName";
  if (k === "classgroup" || k === "class" || k === "lop" || k === "tenlop") return "ClassGroup";
  if (k === "createdat" || k === "created_at" || k === "ngaytao") return "CreatedAt";
  
  // Mapping for Questions
  if (k === "questionid" || k === "question_id" || k === "macauhoi") return "QuestionID";
  if (k === "examid" || k === "exam_id" || k === "de" || k === "made") return "ExamID";
  if (k === "level" || k === "capdo") return "Level";
  if (k === "questiontype" || k === "type" || k === "loai" || k === "loaicauhoi") return "QuestionType";
  if (k === "questioncontent" || k === "content" || k === "cauhoi" || k === "noidung") return "QuestionContent";
  if (k === "answers" || k === "dapan" || k === "answers_list" || k === "danhsachdapan") return "Answers";
  if (k === "correctanswer" || k === "correct" || k === "dapandung" || k === "dapanđung") return "CorrectAnswer";
  if (k === "explanation" || k === "explain" || k === "giaithich") return "Explanation";
  if (k === "image" || k === "anh") return "Image";
  if (k === "video") return "Video";
  if (k === "audio") return "Audio";
  if (k === "score" || k === "diem") return "Score";
  
  // Mapping for Score
  if (k === "submittime" || k === "submit_time" || k === "ngaynop" || k === "thoigiannop") return "SubmitTime";
  if (k === "wrong" || k === "sai" || k === "socausai") return "Wrong";
  if (k === "correct" || k === "dung" || k === "socaudung") return "Correct";
  if (k === "time" || k === "thoigian" || k === "thoigianlam") return "Time";

  // If no match, PascalCase or clean key
  return key.toString().trim();
}

function getColumnValues(sheet, columnName) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  var headers = getHeaders(sheet);
  var colIndex = headers.indexOf(columnName) + 1;
  if (colIndex === 0) return [];
  
  var values = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues();
  return values.map(function(row) { return row[0].toString(); }).filter(Boolean);
}

function updateCell(sheet, rowNum, columnName, value) {
  var headers = getHeaders(sheet);
  var colIndex = headers.indexOf(columnName) + 1;
  if (colIndex > 0) {
    sheet.getRange(rowNum, colIndex).setValue(value);
  }
}

function padZero(num, size) {
  var s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}
