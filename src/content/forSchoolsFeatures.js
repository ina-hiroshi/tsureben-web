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
