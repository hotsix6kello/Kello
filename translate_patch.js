const fs = require('fs');
const path = require('path');

const locales = ['ar', 'cn', 'de', 'en', 'es', 'fr', 'id', 'jp', 'ko', 'ms', 'pt', 'ru', 'th', 'tw', 'vi'];

const translations = {
    ar: { "community": { "title": "مشاركاتي في المجتمع", "empty": "لم تتم كتابة مشاركات بعد." }, "detail": "تفاصيل المشاركة" },
    cn: { "community": { "title": "我的社区动态", "empty": "还没有撰写任何社区动态。" }, "detail": "帖子详情" },
    de: { "community": { "title": "Meine Community-Beiträge", "empty": "Noch keine Community-Beiträge geschrieben." }, "detail": "Beitrag Details" },
    en: { "community": { "title": "My Community Posts", "empty": "No community posts written yet." }, "detail": "Post Detail" },
    es: { "community": { "title": "Mis Publicaciones de la Comunidad", "empty": "Aún no se han escrito publicaciones." }, "detail": "Detalle de la publicación" },
    fr: { "community": { "title": "Mes Posts de la Communauté", "empty": "Aucun post n'a encore été écrit." }, "detail": "Détail de la publication" },
    id: { "community": { "title": "Postingan Komunitas Saya", "empty": "Belum ada postingan komunitas yang ditulis." }, "detail": "Detail Postingan" },
    jp: { "community": { "title": "マイコミュニティ投稿", "empty": "まだコミュニティの投稿がありません。" }, "detail": "投稿の詳細" },
    ko: { "community": { "title": "내 커뮤니티 활동", "empty": "작성하신 커뮤니티 게시글이 없습니다." }, "detail": "포스트 상세" },
    ms: { "community": { "title": "Kiriman Komuniti Saya", "empty": "Belum ada kiriman komuniti." }, "detail": "Butiran Kiriman" },
    pt: { "community": { "title": "Minhas Postagens", "empty": "Nenhuma postagem escrita ainda." }, "detail": "Detalhes da Postagem" },
    ru: { "community": { "title": "Мои посты в сообществе", "empty": "Пока нет написанных постов." }, "detail": "Детали поста" },
    th: { "community": { "title": "โพสต์ของฉัน", "empty": "ยังไม่มีโพสต์ในชุมชน" }, "detail": "รายละเอียดโพสต์" },
    tw: { "community": { "title": "我的社群動態", "empty": "還沒有撰寫任何社群動態。" }, "detail": "貼文詳情" },
    vi: { "community": { "title": "Bài viết Của Tôi", "empty": "Chưa có bài viết nào được tạo." }, "detail": "Chi tiết Bài viết" }
};

locales.forEach(loc => {
    const file = path.join(__dirname, 'public/locales', loc, 'common.json');
    if (!fs.existsSync(file)) return;

    let data = JSON.parse(fs.readFileSync(file, 'utf8'));

    // Inject into my_page
    if (!data.my_page) data.my_page = {};
    if (!data.my_page.community) data.my_page.community = {};
    data.my_page.community.title = translations[loc].community.title;
    data.my_page.community.empty = translations[loc].community.empty;

    // Inject into community_page
    if (!data.community_page) data.community_page = {};
    data.community_page.detail = translations[loc].detail;

    fs.writeFileSync(file, JSON.stringify(data, null, 4));
});

console.log('Language files updated successfully.');
