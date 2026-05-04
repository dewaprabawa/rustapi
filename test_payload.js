async function test() {
  try {
    const response = await fetch('http://localhost:3000/admin/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: "Introduction to Basic English",
        title_id: "Pengenalan Bahasa Inggris Dasar",
        category: "general",
        level: "a1",
        module_id: "69f4cbe69d78f75757a7e4ea",
        content: "## Introduction to English \nThis lesson covers the basics of the English language. **Learning English** can be fun and easy. Here are the topics we will cover: \n* Introduction to grammar \n* Basic vocabulary \n* Simple sentences",
        content_id: "## Pengenalan Bahasa Inggris \nPelajaran ini membahas dasar-dasar bahasa Inggris. **Belajar Bahasa Inggris** dapat menyenangkan dan mudah. Berikut adalah topik yang akan kita bahas: \n* Pengenalan tata bahasa \n* Vokabuler dasar \n* Kalimat sederhana",
        xp_reward: 10,
        instruction: "",
        instruction_id: "",
        culture_notes: "",
        tags: [],
        cover_image_url: ""
      })
    });
    console.log(response.status);
    console.log(await response.text());
  } catch (err) {
    console.error(err);
  }
}

test();
