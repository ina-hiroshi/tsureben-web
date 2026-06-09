/** 学校向け契約資料 PDF（public 配下に配置） */
export const SCHOOL_GUIDE_PDF_PATH = '/tsureben-school-guide.pdf';

/** 開発の背景（生徒・教員それぞれの課題） */
export const FOR_SCHOOLS_BACKGROUND = {
  lead:
    '受験生の夏は孤独になりがちで、学習計画を続ける習慣づくりが大切です。1人で勉強していても、友達の頑張りを見て「もう少し頑張ろう」と思える仕組みを目指して開発しました。',
  challenges: [
    {
      id: 'student',
      side: '生徒側',
      heading: '自学習は「続かない」',
      points: ['計画が続かない', 'ひとりで孤独', 'サボってしまう'],
    },
    {
      id: 'teacher',
      side: '教員側',
      heading: '学習が「見えない」',
      points: [
        'いつ・何を・どれだけ学習しているか分からない',
        '面談や指導が「印象論」になりがち',
        '生徒の学習状況から適切なアドバイスをしたい',
      ],
    },
  ],
};

/** TsureBen の 3 つの機能（PDF のアプリ概要に対応） */
export const FOR_SCHOOLS_CORE_FEATURES = [
  {
    id: 'share',
    badge: '1',
    category: '頑張りの共有',
    title: '友達と一緒に学習',
    description:
      '「一緒に勉強中」で現在学習中の友人を表示。QRコードやLINE等の共有リンクで連れ勉仲間をつくり、仲間の頑張りを励みに学習を続けられます（学習時間そのものは共有されません）。',
  },
  {
    id: 'plan-record',
    badge: '2',
    category: '計画と記録',
    title: '計画的な学習と記録',
    description:
      '学習計画を細かく設定でき、週・月単位でも表示。学習タイマーで学習時間を計測し、学習記録で達成率や学習状況を振り返れます。',
  },
  {
    id: 'advice',
    badge: '3',
    category: '進路指導補助',
    title: '生徒へのアドバイス',
    description:
      '教員は生徒の現在の学習状況や学習計画・記録を確認し、フィードバック機能で学習アドバイスを送信できます。コメントは全件履歴が残り、学校管理者が閲覧できます。',
  },
];

/** ログイン方法（生徒・教員） */
export const FOR_SCHOOLS_LOGIN_METHODS = [
  {
    id: 'student',
    role: '生徒',
    points: [
      'メールアドレス（学校指定ドメイン）と初期パスワード（8桁以上）でログイン。いずれも学校管理者が登録します。',
      '初回ログイン時に、8文字以上の新しいパスワードへ変更します。',
      '「一緒に勉強中」の公開範囲（学年のみ／組のみ／連れ勉仲間のみ）と連れ勉の申請範囲（学内のみ／学内外）を設定できます。',
    ],
  },
  {
    id: 'teacher',
    role: '教員',
    points: [
      '「教員専用ログイン」から Google 認証でログインします。',
      '管理画面で生徒・教員の一括登録やフィードバックの確認ができます。',
    ],
  },
];

/** 進路指導への展望 */
export const FOR_SCHOOLS_CAREER_VISION = [
  {
    id: 'continuous-support',
    title: '組織的・継続的な学習支援',
    description:
      '教員コメント機能を通じて、学校全体で継続的に生徒の学習を支援します。',
  },
  {
    id: 'guidance-material',
    title: '面談の材料として活用',
    description:
      '生徒一人ひとりの学習履歴を、進路面談・三者面談の材料として活用できます。',
  },
];

/** 学校向け紹介ページの機能セクション（public/intro の画像パス） */
export const FOR_SCHOOLS_FEATURES = [
  {
    id: 'home',
    title: 'ホームで学習の全体像を把握',
    description:
      '「今、一緒に勉強中」で仲間の学習状況を確認し、本日の学習時間や今日の計画をひと目で把握。連れ勉の申請もホームから承認できます。',
    iphoneSrc: '/intro/iphone-home.png',
    ipadSrc: '/intro/ipad-home.png',
  },
  {
    id: 'timer',
    title: '学習タイマーで集中時間を計測',
    description:
      'シンプルなタイマーで学習を開始。一緒に勉強中の仲間を見ながら、科目ごとに学習時間を記録できます。',
    iphoneSrc: '/intro/iphone-timer.png',
    ipadSrc: '/intro/ipad-timer.png',
  },
  {
    id: 'plan-day',
    title: '学習計画を日単位で作成',
    description:
      '教科・単元・メモを添えて時間割形式で計画を登録。予定の追加・編集で、日々の自学習リズムを整えられます。',
    iphoneSrc: '/intro/iphone-plan-day.png',
    ipadSrc: '/intro/ipad-plan-day.png',
  },
  {
    id: 'plan-week',
    title: '週間・月間で計画を俯瞰',
    description:
      '週間予定では科目別の時間配分を棒グラフで確認。月間カレンダーでは計画件数や予定時間の合計を把握できます。',
    iphoneSrc: '/intro/iphone-plan-week.png',
    ipadSrc: null,
  },
  {
    id: 'record',
    title: '学習記録で振り返りと分析',
    description:
      '計画との達成率、教科別の学習時間、日別の推移を可視化。記録の追加・編集で、振り返りと指導の材料に使えます。',
    iphoneSrc: '/intro/iphone-record-month.png',
    ipadSrc: '/intro/ipad-record-day.png',
  },
  {
    id: 'plan-month-calendar',
    title: '月間カレンダーで計画を管理',
    description:
      '月全体の予定をカレンダー表示。日付をタップして詳細を確認し、教科別の予定時間も一覧できます。',
    iphoneSrc: '/intro/iphone-plan-month.png',
    ipadSrc: null,
  },
  {
    id: 'mate',
    title: '連れ勉で仲間と学習を共有',
    description:
      'QRコードやリンクで仲間を招待し、申請・承認で連れ勉仲間に。学内の仲間と一緒に勉強するモチベーションを支えます。',
    iphoneSrc: '/intro/iphone-mate.png',
    ipadSrc: '/intro/ipad-mate.png',
  },
];

export const FOR_SCHOOLS_ONBOARDING_STEPS = [
  {
    step: 1,
    title: '機能とプランを確認',
    description: '本ページでアプリの使い方と料金の概要をご覧ください。',
  },
  {
    step: 2,
    title: 'お申し込み',
    description: '料金ページでプランを選び、Stripe でカード登録を行います。',
  },
  {
    step: 3,
    title: '管理者ログイン・初期設定',
    description:
      'お支払い完了後、同じメールの Google アカウントで教員ログインし、管理画面から生徒・教員を一括登録します。',
  },
];
