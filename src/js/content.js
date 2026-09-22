// Bilingual content dictionary.
// Each leaf is { zh, en }. Resolved by dot-path via data-i18n="a.b.c" attributes.

export const XHS_FAN_URL =
  "https://www.xiaohongshu.com/user/profile/5c2886fb00000000060205bf?xsec_token=YBJZ560n_nt8B1hKWAosJnuyjE2nPVlZJcaieNZuoa3bQ=&xsec_source=app_share&xhsshare=CopyLink&shareRedId=N0k0ODs7Sks2NzUyOTgwNjY5OTk0OkhP&apptime=1789994628&share_id=dce760a4c90f40008119cfd1c1e23ab9";
export const XHS_FIC_URL = "https://xhslink.cn/o/3qJdfT2xpSW";

export const content = {
  meta: {
    title: { zh: "李云舒 · 作品集", en: "Yunshu Li · Portfolio" },
  },

  nav: {
    about: { zh: "关于", en: "About" },
    content: { zh: "内容创作", en: "Content" },
    project: { zh: "主导项目", en: "Project" },
    langToggle: { zh: "EN", en: "中" },
  },

  hero: {
    eyebrow: { zh: "作品集 · 2026", en: "Portfolio · 2026" },
    nameZh: { zh: "李云舒", en: "Yunshu Li" },
    nameEn: { zh: "Yunshu Li", en: "李云舒" },
    role: { zh: "内容创作者 · 项目负责人", en: "Content Creator · Project Lead" },
    scroll: { zh: "向下滚动", en: "Scroll" },
  },

  about: {
    label: { zh: "关于我", en: "About" },
    heading: { zh: "两种叙事视角，一种做事方法", en: "Two lenses, one way of working" },
    stats: [
      {
        value: { zh: "2", en: "2" },
        label: { zh: "自媒体账号持续运营中", en: "self-media accounts, actively run" },
      },
      {
        value: { zh: "99%", en: "99%" },
        label: { zh: "同人账号互动数超同类创作者", en: "engagement outperforms peer creators" },
      },
      {
        value: { zh: "1", en: "1" },
        label: { zh: "次带队完成调研到成片全流程", en: "field research led end-to-end, to final cut" },
      },
    ],
  },

  social: {
    label: { zh: "内容创作", en: "Content Creation" },
    heading: { zh: "两个账号，两种声音", en: "Two Accounts, Two Voices" },
    intro: {
      zh: "长期运营的两个小红书账号，服务不同的粉丝语境，用不同的节奏讲故事。",
      en: "Two long-running Xiaohongshu accounts, each built for a different fan context and a different storytelling rhythm.",
    },
    cta: { zh: "查看小红书主页", en: "View Xiaohongshu Profile" },
    fan: {
      badge: { zh: "粉丝社群向", en: "Fan Community" },
      title: { zh: "K-pop 饭拍与内容本地化", en: "K-pop Fancams & Localization" },
      desc: {
        zh: "持续发布 K-pop 饭拍、海外内容本地化与粉丝向创作，专注短视频剪辑与社群运营，触达更广泛的泛粉丝受众。",
        en: "Ongoing K-pop fancam releases, overseas content localization, and fan-oriented short-form video — built for reach across a broad fan audience.",
      },
      stats: [
        { value: "67.1K", label: { zh: "单篇最高曝光", en: "peak post impressions" } },
        { value: "21.2K", label: { zh: "单篇最高观看", en: "peak post views" } },
        { value: "16.5%", label: { zh: "互动率 · 超 65% 同类", en: "engagement · top 35% of peers" } },
        { value: "62.4%", label: { zh: "5 秒完播率", en: "5-second completion rate" } },
      ],
      chartTitle: { zh: "爆款笔记流量来源", en: "Top Post — Traffic Sources" },
      chartData: [
        { label: { zh: "首页推荐", en: "Home feed" }, value: 50.5 },
        { label: { zh: "视频推荐", en: "Video feed" }, value: 43.3 },
        { label: { zh: "其他来源", en: "Other" }, value: 6.2 },
      ],
    },
    fic: {
      badge: { zh: "同人创作", en: "Fan Fiction" },
      title: { zh: "BTS 向连载故事", en: "BTS-Inspired Serial Fiction" },
      desc: {
        zh: "长期更新的 BTS 向连载同人故事，核心读者是 18–24 岁的年轻女性。",
        en: "An ongoing series of BTS-inspired serialized fiction, read mainly by women aged 18–24.",
      },
      stats: [
        { value: "+19.5%", label: { zh: "粉丝周环比增长率", en: "weekly follower growth rate" } },
        { value: "超 99%", label: { zh: "互动数超同类创作者", en: "engagement beats peer creators" } },
        { value: "90.1%", label: { zh: "活跃粉丝占比", en: "active-follower rate" } },
        { value: "31.7%", label: { zh: "爆款笔记互动率", en: "top post engagement rate" } },
      ],
      chartTitle: { zh: "爆款笔记读者年龄分布", en: "Top Post — Reader Age Split" },
      chartData: [
        { label: { zh: "18–24 岁", en: "18–24" }, value: 46 },
        { label: { zh: "25–34 岁", en: "25–34" }, value: 36 },
        { label: { zh: "35–44 岁", en: "35–44" }, value: 8 },
        { label: { zh: "18 岁以下", en: "Under 18" }, value: 6 },
        { label: { zh: "44 岁以上", en: "45+" }, value: 4 },
      ],
    },
  },

  proof: {
    label: { zh: "后台实录", en: "Behind the Numbers" },
    heading: { zh: "每一个数字，都有截图为证", en: "Every number, screenshotted" },
    intro: {
      zh: "上面两组数据都来自小红书创作者后台，随手放一些原始截图，细节都在这里了。",
      en: "The stats above come straight from the Xiaohongshu creator dashboard — here are the raw screenshots behind them.",
    },
    fanLabel: { zh: "粉丝社群向 · 后台数据", en: "Fan Community — Dashboard" },
    ficLabel: { zh: "同人创作 · 后台数据", en: "Fan Fiction — Dashboard" },
  },

  project: {
    label: { zh: "主导项目", en: "Featured Project" },
    heading: {
      zh: "四川广元农业企业调研与宣传项目",
      en: "Guangyuan Agribusiness Field Research & Campaign",
    },
    role: { zh: "社会实践项目负责人", en: "Project Lead, Field Research Program" },
    place: { zh: "四川 · 广元", en: "Guangyuan, Sichuan" },
    org: { zh: "川珍实业有限公司", en: "Chuanzhen Industrial Co., Ltd." },
    companyBlurb: {
      zh: "川珍实业成立于 2003 年，是农业产业化国家重点龙头企业，主导黑木耳、竹荪、天麻等食用菌产品的种植与深加工，产品远销美国、加拿大、英国等 8 个国家。",
      en: "Founded in 2003, Chuanzhen is a national-level leading agribusiness enterprise specializing in the cultivation and processing of edible fungi — black fungus, bamboo fungus, and gastrodia — with products exported to eight countries including the US, Canada, and the UK.",
    },
    bullets: [
      {
        zh: "担任项目负责人，带队赴四川广元开展农业企业「川珍实业有限公司」实地调研，负责团队协调、任务分工及现场采访转录。",
        en: "Led a student team to Guangyuan, Sichuan for an on-site study of Chuanzhen Industrial Co., Ltd., overseeing team coordination, task allocation, and on-site interview transcription.",
      },
      {
        zh: "走访当地农业企业及合作方，收集整理生产端、销售端及其与新媒体结合情况的一线信息。",
        en: "Visited local agribusinesses and partners to gather first-hand information across production, sales, and their integration with new media.",
      },
      {
        zh: "将调研内容转化为线上宣传片内容，协助开展农业企业宣传及农产品销售推广，实践从素材采集、内容制作到传播推广的完整流程。",
        en: "Translated field research into a promotional video, supporting the company's outreach and product sales — covering the full pipeline from footage capture through production to distribution.",
      },
    ],
    videoCaption: { zh: "调研成果宣传片", en: "Field research promo film" },
    videoPlay: { zh: "播放宣传片", en: "Play promo film" },
    galleryHeading: { zh: "实地影像", en: "On the Ground" },
  },

  gallery: [
    { file: "guangyuan-interview", zh: "山地间的实地采访", en: "On-site interview in the hills", span: "tall" },
    { file: "guangyuan-park-gate", zh: "青川县山珍现代农业产业园", en: "Qingchuan Shanzhen Agri-Park entrance", span: "" },
    { file: "guangyuan-mushroom-shed", zh: "食用菌种植大棚", en: "Fungi cultivation greenhouse", span: "wide" },
    { file: "guangyuan-shiitake-bag", zh: "刚采收的香菇", en: "Freshly harvested shiitake", span: "tall" },
    { file: "guangyuan-chili-line", zh: "生产车间实地走访", en: "Touring the processing line", span: "" },
    { file: "guangyuan-filling-room", zh: "自动化灌装车间", en: "Automated filling room", span: "" },
    { file: "guangyuan-park-building", zh: "现代农业产业园区", en: "Modern agricultural park", span: "wide" },
    { file: "guangyuan-honors-wall", zh: "企业荣誉墙", en: "Company honors wall", span: "" },
  ],

  footer: {
    heading: { zh: "感谢浏览", en: "Thanks for stopping by" },
    sub: {
      zh: "这份作品集仍在生长，欢迎随时回来看看。",
      en: "This portfolio is still growing — feel free to check back.",
    },
    backToTop: { zh: "回到顶部", en: "Back to top" },
    mailHint: { zh: "邮箱联系", en: "Email me" },
  },
};

export const PROOF_FAN_COUNT = 4;
export const PROOF_FIC_COUNT = 14;
export const CONTACT_EMAILS = ["liyunshu2@gmail.com", "2854521822@qq.com"];
