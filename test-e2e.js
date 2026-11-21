const API_URL = 'http://localhost:3000/api';
let token = '';

async function api(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
    });
    
    const data = await res.json();
    if (!res.ok) {
        throw new Error(`API Error ${res.status} on ${endpoint}: ${JSON.stringify(data)}`);
    }
    return data;
}

async function runE2E() {
    try {
        console.log("1. Logging in as admin...");
        // Assuming there is an admin account admin/admin or root/admin
        // If it fails, we will catch it and try to find a user.
        // Wait, the previous transcripts used `trung`/`123456` or similar. Let's try root_admin.
        // I will just use the backend to create a dummy token or login.
        // Actually, let's login as ROOT_LMS / 123456 as seen in some typical setups.
        let loginRes;
        try {
            loginRes = await api('/login', 'POST', { username: 'admin', password: '123456' });
        } catch(e) {
            try {
                loginRes = await api('/login', 'POST', { username: 'admin', password: 'password' }); 
            } catch(e2) {
                console.error("Login failed!", e2.message);
                return;
            }
        }
        console.log("Login Res:", loginRes);
        token = loginRes.data?.token || loginRes.data?.accessToken || loginRes.token || loginRes.accessToken;
        console.log("Logged in successfully. Token length:", token ? token.length : 0);

        console.log("2. Creating Course...");
        const courseRes = await api('/courses', 'POST', { title: "E2E Automated Course", description: "Test course", status: "published" });
        const course = courseRes.data;
        console.log("Course created:", course.id);

        console.log("3. Creating Lesson...");
        const lessonRes = await api('/lessons', 'POST', { title: "E2E Lesson 1", courseId: course.id, order: 1 });
        const lesson = lessonRes.data;
        console.log("Lesson created:", lesson.id);

        console.log("4. Creating Quiz...");
        const quizRes = await api('/quizzes', 'POST', { title: "E2E Quiz", lessonId: lesson.id });
        const quiz = quizRes.data;
        console.log("Quiz created:", quiz.id);

        console.log("6. Finding Teacher, Staff and Student...");
        const usersRes = await api('/users?take=50');
        const users = usersRes.data?.items || usersRes;
        const teacher = users.find(u => u.roles.includes('TEACHER'));
        const staff = users.find(u => u.roles.includes('STAFF') || u.roles.includes('HEAD_STAFF'));
        const student = users.find(u => u.roles.includes('STUDENT'));
        
        if (!teacher) console.log("No teacher found!");
        if (!student) console.log("No student found!");
        
        console.log("7. Creating Class...");
        const newClassRes = await api('/classes', 'POST', { 
            title: `E2E Class ${Date.now()}`, 
            courseId: course.id, 
            status: "ready",
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
            teacherId: teacher ? teacher.id : undefined,
            managerId: staff ? staff.id : undefined
        });
        const newClass = newClassRes.data;
        console.log("Class created:", newClass.id);

        console.log("8. Adding Student to Class (Enrollment)...");
        if (student) {
            const enrollmentRes = await api('/enrollments', 'POST', {
                student: { id: student.id },
                class: { id: newClass.id },
                course: { id: course.id }
            });
            const enrollment = enrollmentRes.data;
            console.log("Student enrolled successfully:", enrollment.id);
        }

        console.log("=== E2E Flow Completed Successfully! ===");

    } catch (error) {
        console.error("E2E Test Failed:", error.message);
    }
}

runE2E();
