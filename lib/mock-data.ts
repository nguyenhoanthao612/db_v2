import { Question, Student, Admin, ScoreRecord, Exam } from './types';

export const initialStudents: Student[] = [
  {
    StudentID: 'S001',
    SchoolName: 'THPT Nguyễn Trãi',
    Username: 'student1',
    Password: '123',
    FullName: 'Nguyễn Văn Minh',
    ClassGroup: '10A1',
    CreatedAt: '2026-06-01T08:00:00Z',
  },
  {
    StudentID: 'S002',
    SchoolName: 'THPT Nguyễn Trãi',
    Username: 'student2',
    Password: '123',
    FullName: 'Trần Thị Mai',
    ClassGroup: '11B3',
    CreatedAt: '2026-06-05T09:30:00Z',
  },
  {
    StudentID: 'S003',
    SchoolName: 'THPT Lê Quý Đôn',
    Username: 'student3',
    Password: '123',
    FullName: 'Lê Hoàng Nam',
    ClassGroup: '12C2',
    CreatedAt: '2026-06-10T14:15:00Z',
  },
];

export const initialAdmins: Admin[] = [
  {
    AdminID: 'A001',
    Username: 'admin',
    Password: 'admin123',
    Role: 'Admin',
  },
];

export const initialQuestions: Question[] = [
  // 1. Multiple Choice
  {
    QuestionID: 'Q001',
    ExamID: 'OT1',
    Level: 'LV1',
    QuestionType: 'Multiple Choice',
    QuestionContent: 'Đâu là một phương thức xác thực đa yếu tố (MFA) mang lại độ an toàn cao nhất hiện nay?',
    Answers: JSON.stringify({
      options: [
        'Chỉ sử dụng một mật khẩu siêu dài chứa ký tự đặc biệt',
        'Xác thực mật khẩu thông thường cộng với mã OTP gửi qua tin nhắn điện thoại SMS',
        'Xác thực mật khẩu thông thường cộng với khóa bảo mật vật lý (YubiKey) hoặc Ứng dụng xác thực (Authenticator App)',
        'Xác thực bằng cách nhập mật khẩu và trả lời các câu hỏi bảo mật cá nhân',
      ],
    }),
    CorrectAnswer: '2', // Option index 2
    Explanation: 'SMS OTP dễ bị tấn công SIM swap hoặc đánh chặn. Ứng dụng xác thực (như Google/Microsoft Authenticator) tạo mã trên thiết bị cục bộ, hoặc khóa bảo mật vật lý (FIDO2) là phương thức MFA an toàn nhất để chống lừa đảo.',
    Score: 10,
    CreatedAt: '2026-06-15T08:00:00Z',
  },
  // 2. Multiple Response
  {
    QuestionID: 'Q002',
    ExamID: 'OT1',
    Level: 'LV1',
    QuestionType: 'Multiple Response',
    QuestionContent: 'Những hành vi nào sau đây giúp nâng cao tính bảo mật khi tham gia hoạt động trên Internet? (Chọn tất cả các đáp án đúng)',
    Answers: JSON.stringify({
      options: [
        'Kích hoạt xác thực 2 lớp (2FA) trên tất cả các tài khoản mạng xã hội và email.',
        'Sử dụng cùng một mật khẩu cho mọi tài khoản trực tuyến để tránh bị quên.',
        'Sử dụng công cụ quản lý mật khẩu (Password Manager) để lưu trữ các mật khẩu ngẫu nhiên.',
        'Tránh nhấp chuột vào các đường liên kết lạ gửi qua email từ người gửi không xác định.',
      ],
    }),
    CorrectAnswer: JSON.stringify([0, 2, 3]), // Indexes 0, 2, 3 are correct
    Explanation: 'Sử dụng cùng một mật khẩu cho nhiều tài khoản là lỗi bảo mật nghiêm trọng (Credential Stuffing). Bật 2FA, dùng Password Manager và cảnh giác với Phishing là các thực hành an toàn chuẩn.',
    Score: 10,
    CreatedAt: '2026-06-15T08:05:00Z',
  },
  // 3. True / False
  {
    QuestionID: 'Q003',
    ExamID: 'OT1',
    Level: 'LV1',
    QuestionType: 'True / False',
    QuestionContent: 'Phần mềm độc hại thuộc loại Ransomware hoạt động bằng cách mã hóa các tệp tin của người dùng và đòi tiền chuộc để giải mã.',
    Answers: JSON.stringify({
      options: ['Đúng', 'Sai'],
    }),
    CorrectAnswer: 'Đúng',
    Explanation: 'Ransomware (mã độc tống tiền) là loại phần mềm độc hại ngăn chặn người dùng truy cập vào hệ thống hoặc dữ liệu cá nhân của họ, sau đó yêu cầu thanh toán tiền chuộc (thường bằng tiền điện tử) để nhận khóa giải mã.',
    Score: 10,
    CreatedAt: '2026-06-15T08:10:00Z',
  },
  // 4. Matching
  {
    QuestionID: 'Q004',
    ExamID: 'OT2',
    Level: 'LV1',
    QuestionType: 'Matching',
    QuestionContent: 'Hãy ghép nối cổng kết nối vật lý trên máy tính với chức năng truyền tải phù hợp nhất của chúng:',
    Answers: JSON.stringify({
      leftOptions: ['Cổng HDMI', 'Cổng Ethernet (RJ-45)', 'Cổng USB-C'],
      rightOptions: [
        'Truyền tải hình ảnh và âm thanh số chất lượng cao lên màn hình/TV.',
        'Kết nối mạng internet cục bộ bằng dây cáp đồng.',
        'Cổng đa năng hỗ trợ truyền dữ liệu tốc độ cao, tín hiệu hình ảnh và sạc nguồn thiết bị.',
      ],
    }),
    CorrectAnswer: JSON.stringify({
      'Cổng HDMI': 'Truyền tải hình ảnh và âm thanh số chất lượng cao lên màn hình/TV.',
      'Cổng Ethernet (RJ-45)': 'Kết nối mạng internet cục bộ bằng dây cáp đồng.',
      'Cổng USB-C': 'Cổng đa năng hỗ trợ truyền dữ liệu tốc độ cao, tín hiệu hình ảnh và sạc nguồn thiết bị.',
    }),
    Explanation: 'HDMI chuyên phát âm thanh/hình ảnh. Ethernet (RJ-45) dùng nối mạng có dây. USB-C là chuẩn kết nối hiện đại tích hợp đa tính năng.',
    Score: 10,
    CreatedAt: '2026-06-15T08:15:00Z',
  },
  // 5. Sequence Ordering
  {
    QuestionID: 'Q005',
    ExamID: 'OT2',
    Level: 'LV1',
    QuestionType: 'Sequence Ordering',
    QuestionContent: 'Hãy sắp xếp các bước sau theo đúng thứ tự logic để kết nối máy tính chạy hệ điều hành Windows 11 vào một mạng Wi-Fi bảo mật:',
    Answers: JSON.stringify({
      sequenceItems: [
        'Nhấp chuột vào biểu tượng mạng ở thanh Taskbar góc dưới bên phải màn hình.',
        'Nhấp chọn vào tên mạng Wi-Fi mong muốn trong danh sách hiển thị.',
        'Nhấp chuột chọn nút "Connect" (Kết nối).',
        'Nhập chính xác mật khẩu (Security key) của mạng Wi-Fi đó rồi chọn Next.',
      ],
    }),
    CorrectAnswer: JSON.stringify([0, 1, 2, 3]), // Correct chronological order
    Explanation: 'Thứ tự đúng: Mở menu mạng nhanh -> Chọn mạng -> Nhấn Connect -> Nhập mật khẩu mạng để xác thực và thiết lập liên kết.',
    Score: 10,
    CreatedAt: '2026-06-15T08:20:00Z',
  },
  // 6. True/False Multiple
  {
    QuestionID: 'Q006',
    ExamID: 'OT1',
    Level: 'LV2',
    QuestionType: 'True/False Multiple',
    QuestionContent: 'Hãy xác định tính Đúng (True) hoặc Sai (False) cho mỗi phát biểu sau đây liên quan đến hoạt động của điện toán đám mây (Cloud Computing):',
    Answers: JSON.stringify({
      statements: [
        'Dữ liệu lưu trên Google Drive luôn có sẵn ngay cả khi máy tính của bạn hoàn toàn mất kết nối Internet và không thiết lập chế độ offline.',
        'Microsoft OneDrive và Dropbox là các dịch vụ SaaS (Software as a Service) cung cấp lưu trữ đám mây.',
        'Sử dụng điện toán đám mây giúp các tổ chức giảm chi phí đầu tư hạ tầng phần cứng máy chủ vật lý ban đầu.',
      ],
      options: ['Đúng', 'Sai'],
    }),
    CorrectAnswer: JSON.stringify([false, true, true]), // Statement 1: False, Statement 2: True, Statement 3: True
    Explanation: 'Phát biểu 1 Sai vì không có mạng Internet và không thiết lập chế độ ngoại tuyến (offline) thì không thể truy cập tài liệu mây. Phát biểu 2 Đúng vì OneDrive/Dropbox là ví dụ lưu trữ cloud. Phát biểu 3 Đúng vì doanh nghiệp chỉ cần thuê tài nguyên thay vì tự lắp đặt máy chủ vật lý tốn kém.',
    Score: 10,
    CreatedAt: '2026-06-15T08:25:00Z',
  },
  // 7. Video Based
  {
    QuestionID: 'Q007',
    ExamID: 'OT1',
    Level: 'LV2',
    QuestionType: 'Video Based',
    QuestionContent: 'Xem video minh họa dưới đây và cho biết: Phím tắt hữu dụng nào trên các trình duyệt web phổ biến (Edge, Chrome, Safari) giúp bạn phục hồi ngay lập tức tab trang web vừa bị đóng nhầm trước đó?',
    Answers: JSON.stringify({
      options: [
        'Tổ hợp phím Ctrl + Shift + N (hoặc Cmd + Shift + N)',
        'Tổ hợp phím Ctrl + Shift + T (hoặc Cmd + Shift + T)',
        'Tổ hợp phím Ctrl + H (hoặc Cmd + Y)',
        'Tổ hợp phím Ctrl + R (hoặc Cmd + R)',
      ],
    }),
    Video: 'https://www.w3schools.com/html/mov_bbb.mp4', // Safe sample video
    CorrectAnswer: '1', // Index 1 is Ctrl + Shift + T
    Explanation: 'Tổ hợp phím Ctrl + Shift + T (hoặc Cmd + Shift + T trên macOS) dùng để mở lại tab vừa đóng gần nhất. Bạn có thể nhấn nhiều lần để khôi phục các tab đã đóng trước đó theo thứ tự ngược lại.',
    Score: 10,
    CreatedAt: '2026-06-15T08:30:00Z',
  },
  // 8. Categorization
  {
    QuestionID: 'Q008',
    ExamID: 'OT2',
    Level: 'LV2',
    QuestionType: 'Categorization',
    QuestionContent: 'Hãy phân loại các thiết bị phần cứng máy tính sau vào đúng cột chức năng tương ứng: Thiết bị Nhập (Input Device) hoặc Thiết bị Xuất (Output Device):',
    Answers: JSON.stringify({
      categoryItems: [
        'Bàn phím cơ (Keyboard)',
        'Màn hình hiển thị (Monitor)',
        'Chuột máy tính (Mouse)',
        'Máy in laser (Printer)',
        'Micro thu âm (Microphone)',
        'Tai nghe nhạc (Headphones)',
      ],
      categories: ['Thiết bị Nhập (Input)', 'Thiết bị Xuất (Output)'],
    }),
    CorrectAnswer: JSON.stringify({
      'Bàn phím cơ (Keyboard)': 'Thiết bị Nhập (Input)',
      'Màn hình hiển thị (Monitor)': 'Thiết bị Xuất (Output)',
      'Chuột máy tính (Mouse)': 'Thiết bị Nhập (Input)',
      'Máy in laser (Printer)': 'Thiết bị Xuất (Output)',
      'Micro thu âm (Microphone)': 'Thiết bị Nhập (Input)',
      'Tai nghe nhạc (Headphones)': 'Thiết bị Xuất (Output)',
    }),
    Explanation: 'Các thiết bị truyền tín hiệu điều khiển/dữ liệu vào máy tính là Input (Bàn phím, Chuột, Micro). Thiết bị nhận thông tin xử lý từ máy tính để hiển thị/phát ra ngoài là Output (Màn hình, Máy in, Tai nghe).',
    Score: 10,
    CreatedAt: '2026-06-15T08:35:00Z',
  },
  // 9. Hotspot
  {
    QuestionID: 'Q009',
    ExamID: 'OT1',
    Level: 'LV3',
    QuestionType: 'Hotspot',
    QuestionContent: 'Dưới đây là sơ đồ thanh công cụ của Microsoft Word. Hãy nhấp chọn chính xác vào vùng của biểu tượng "Line and Paragraph Spacing" (Giãn dòng và giãn đoạn văn) để chứng minh kiến thức thao tác định dạng văn bản của bạn:',
    Answers: JSON.stringify({
      hotspots: [
        { id: 'bold', name: 'Chữ Đậm (B)', x: 10, y: 35, width: 15, height: 30 },
        { id: 'align_left', name: 'Căn lề trái', x: 35, y: 35, width: 15, height: 30 },
        { id: 'line_spacing', name: 'Giãn dòng (Line Spacing)', x: 55, y: 35, width: 20, height: 30 },
        { id: 'bullet_list', name: 'Danh sách ký hiệu', x: 80, y: 35, width: 15, height: 30 },
      ],
    }),
    Image: 'https://picsum.photos/seed/wordtoolbar/600/200', // Sơ đồ minh họa
    CorrectAnswer: 'line_spacing',
    Explanation: 'Biểu tượng Giãn dòng (Line and Paragraph Spacing) có dạng các dòng kẻ ngang và hai mũi tên xanh/đen chỉ ngược chiều lên xuống nằm ở nhóm Paragraph của tab Home.',
    Score: 10,
    CreatedAt: '2026-06-15T08:40:00Z',
  },
  // 10. Match Image To Text
  {
    QuestionID: 'Q010',
    ExamID: 'OT1',
    Level: 'LV3',
    QuestionType: 'Match Image To Text',
    QuestionContent: 'Hãy ghép nối các hình ảnh mô phỏng công dụng thực tế với định nghĩa loại hình dịch vụ mạng tương thích:',
    Answers: JSON.stringify({
      imageOptions: [
        'https://picsum.photos/seed/emailservice/120/120',
        'https://picsum.photos/seed/cloudservice/120/120',
        'https://picsum.photos/seed/videocall/120/120',
      ],
      textTargets: [
        'Giao dịch thư tín điện tử chính thức, gửi văn bản/hợp đồng đính kèm.',
        'Lưu trữ đồng bộ tệp dữ liệu chung, phân quyền chia sẻ dự án thời gian thực.',
        'Hội nghị trực tuyến từ xa, gọi điện có hình ảnh trực tiếp thời gian thực.',
      ],
    }),
    CorrectAnswer: JSON.stringify([0, 1, 2]), // Image 0 matches Text 0, Image 1 matches Text 1, Image 2 matches Text 2
    Explanation: 'Các hình ảnh tương ứng với dịch vụ Thư điện tử (Email), Dịch vụ Lưu trữ đám mây (Cloud Storage) và Hội thảo truyền hình trực tuyến (Video Conference).',
    Score: 10,
    CreatedAt: '2026-06-15T08:45:00Z',
  },
  // 11. Matrix Selection
  {
    QuestionID: 'Q011',
    ExamID: 'OT2',
    Level: 'LV3',
    QuestionType: 'Matrix Selection',
    QuestionContent: 'Hãy tích chọn đúng ma trận phân quyền dưới đây để xác định mức quyền hạn tối đa được khuyến nghị tương ứng với mỗi vai trò cộng tác trong hệ thống Google Docs / Sheets:',
    Answers: JSON.stringify({
      matrixRows: [
        'Chủ sở hữu (Owner)',
        'Cộng tác viên (Editor)',
        'Người đánh giá (Commenter)',
        'Độc giả (Viewer)',
      ],
      matrixCols: [
        'Chỉ được phép đọc nội dung',
        'Gửi ý kiến đóng góp / phản hồi',
        'Thay đổi trực tiếp nội dung văn bản',
        'Xóa vĩnh viễn tệp lưu trữ',
      ],
    }),
    CorrectAnswer: JSON.stringify({
      'Chủ sở hữu (Owner)': 'Xóa vĩnh viễn tệp lưu trữ',
      'Cộng tác viên (Editor)': 'Thay đổi trực tiếp nội dung văn bản',
      'Người đánh giá (Commenter)': 'Gửi ý kiến đóng góp / phản hồi',
      'Độc giả (Viewer)': 'Chỉ được phép đọc nội dung',
    }),
    Explanation: 'Chủ sở hữu có toàn quyền gồm cả xóa tệp. Editor có quyền thêm bớt sửa thông tin văn bản. Commenter chỉ nhận xét và Viewer chỉ được đọc dữ liệu.',
    Score: 10,
    CreatedAt: '2026-06-15T08:50:00Z',
  },
];

export const initialExams: Exam[] = [
  {
    ExamID: 'OT1',
    Level: 'LV1',
    QuestionIDs: ['Q001', 'Q002', 'Q003'],
  },
  {
    ExamID: 'OT2',
    Level: 'LV1',
    QuestionIDs: ['Q004', 'Q005'],
  },
  {
    ExamID: 'OT1',
    Level: 'LV2',
    QuestionIDs: ['Q006', 'Q007'],
  },
  {
    ExamID: 'OT2',
    Level: 'LV2',
    QuestionIDs: ['Q008'],
  },
  {
    ExamID: 'OT1',
    Level: 'LV3',
    QuestionIDs: ['Q009', 'Q010'],
  },
  {
    ExamID: 'OT2',
    Level: 'LV3',
    QuestionIDs: ['Q011'],
  },
  {
    ExamID: 'OT3',
    Level: 'LV1',
    QuestionIDs: ['Q001', 'Q003'],
  },
];

export const initialScores: ScoreRecord[] = [
  {
    StudentID: 'S001',
    StudentName: 'Nguyễn Văn Minh',
    ExamID: 'OT1',
    Level: 'LV1',
    Score: 100,
    Correct: 3,
    Wrong: 0,
    Time: 124,
    SubmitTime: '2026-06-25T09:12:00Z',
  },
  {
    StudentID: 'S001',
    StudentName: 'Nguyễn Văn Minh',
    ExamID: 'OT2',
    Level: 'LV1',
    Score: 50,
    Correct: 1,
    Wrong: 1,
    Time: 95,
    SubmitTime: '2026-06-26T10:05:00Z',
  },
  {
    StudentID: 'S002',
    StudentName: 'Trần Thị Mai',
    ExamID: 'OT1',
    Level: 'LV2',
    Score: 100,
    Correct: 2,
    Wrong: 0,
    Time: 180,
    SubmitTime: '2026-06-27T15:30:00Z',
  },
];
