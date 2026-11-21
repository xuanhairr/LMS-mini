import fetch from 'node-fetch';

async function test() {
    const res = await fetch('http://localhost:3000/api/progresses/by-course?studentId=6a0991b38f9692a91aebcef9&courseId=6a0665baeb51d18f5043d99d', {
        headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
test();
