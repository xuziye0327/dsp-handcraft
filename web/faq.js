// 公开网站四个入口页面底下的简介和常见问题（给新访客和搜索引擎看）。web/site.js 打包时按入口的语言放进页面，同时出 FAQPage 结构化数据。
// 中文、英文各写各的，同一页两种语言的问题条数、顺序要一样（test/site.test.js 查）。
// 写法：lead、a 是一段一个字符串的纯文字；只认一种标记 [文字](网址)，网址写相对这一页的（calc/ 在两种语言的入口上都对）或 https:// 开头的。
// 游戏里的按钮、科技名照游戏自带的文字写（粘贴蓝图代码 / Paste Blueprint Code，批量建造 / Mass Construction），页面上的按钮名照页面写。
// tipsTitle、tipsLead、tipsAll（只有生成器有）：常见问题后面一张卡片，链到游戏机制那一页（下面的 TIPS）的各个分组；{n} 换成条数。

const REPO = 'https://github.com/zoujack018/dsp-handcraft';
const DSQ = 'https://github.com/122474363/DSQ';

export const ABOUT = {
  // 蓝图生成器：/ 和 /en/
  gen: {
    zh: {
      title: '戴森球计划产线蓝图生成器',
      lead: [
        '选一个目标产物，填每分钟要多少，它就把整条产线排成一张蓝图：从矿到成品要几台熔炉、几台制造台都算好，传送带、分拣器、供电一起摆上，复制蓝图代码贴进游戏就能建。',
        '排法照玩家手搓的习惯：每种物品走自己的一条带，工厂一行一行排、行与行之间夹着传送带通道，分拣器都紧挨着工厂。免费，在浏览器里运行，不用安装也不用注册。',
      ],
      faqTitle: '常见问题',
      faq: [
        {
          q: '生成的蓝图怎么贴进游戏？',
          a: [
            '排好以后点「复制蓝图」，蓝图代码就在剪贴板里了。进游戏按 Ctrl+V 进入蓝图粘贴模式，在蓝图面板上点「粘贴蓝图代码」，再选位置建造。',
            '也可以在蓝图库里新建一个蓝图，粘贴代码后保存，以后随时取用。游戏里要先研究「批量建造」科技才有蓝图功能。',
          ],
        },
        {
          q: '能排哪些产线？',
          a: [
            '游戏里用工厂造的东西基本都能当目标：铁块、电路板、处理器，一直到六种矩阵（电磁矩阵、能量矩阵、结构矩阵、信息矩阵、引力矩阵、宇宙矩阵，也就是玩家说的蓝糖、红糖、黄糖、紫糖、绿糖、白糖）。一次可以加几个目标，排进同一张图。',
            '也能排重氢的分馏塔阵列。',
          ],
        },
        {
          q: '蓝图里用到的建筑我还没解锁，能换吗？',
          a: ['能。图纸上方那排按钮可以换传送带、分拣器、熔炉、制造台、化工厂、研究站的型号，选喷不喷增产剂，供电用电力感应塔还是卫星配电站，原料和成品走传送带、箱子还是物流站。照你存档里已经解锁的选就行。'],
        },
        {
          q: '能喷增产剂吗？',
          a: ['能。图纸上方最后一个按钮选增产剂的等级，蓝图里会带上喷涂机和给喷涂机送增产剂的传送带。'],
        },
        {
          q: '蓝图能贴在星球的什么位置？',
          a: ['产线里有化工厂、原油精炼厂时，默认的间距只适合贴在赤道附近。要贴到别的纬度，把左栏「化工厂、精炼厂高纬度间距展开」选成「开（任何纬度）」再生成。'],
        },
        {
          q: '贴的时候游戏说设施数量超了怎么办？',
          a: ['一张蓝图一次能建多少设施，由游戏里「批量建造」科技的级别决定，级别低时大蓝图贴不下。把这项科技升上去，或者把每分钟产量调小、分成几张排。'],
        },
        {
          q: '生成一张要等多久？',
          a: ['几十台的小产线几秒到几十秒，几百台的大产线要几分钟。点「生成蓝图」之前，按钮下面会写预计用时。「搜索力度」选「美观」会多花些时间，尽量把图排成和屏幕差不多的横向形状。'],
        },
        {
          q: '生成的蓝图靠得住吗？',
          a: ['每张蓝图出来以后都会另外检查一遍：建筑有没有相撞、传送带接没接上、分拣器够不够得着、电有没有供到，结果列在「检查」里。没通过的图页面会明说，不建议贴。'],
        },
        {
          q: '和从蓝图网站下载现成的蓝图有什么不同？',
          a: ['现成蓝图的产量和用的建筑是别人定的。这里按你要的每分钟产量、你已经解锁的建筑现排一张，不多不少。'],
        },
        {
          q: '免费吗？要联网吗？',
          a: [`免费，开源（GPL-3.0）。排布全在你自己的浏览器里算，不上传你的产线。想离线用，到 [GitHub](${REPO}) 下载整份，解压后打开 index.html 就行。`],
        },
        {
          q: '我只想算配比，不要蓝图',
          a: ['用[量产计算器](calc/)：选目标和每分钟产量，列出每种设备要几台、要多少原料、大约用多少电。算好的产线点「生成蓝图」就带回这里排。'],
        },
      ],
      tipsTitle: '游戏机制小知识',
      tipsLead: '传送带运力、集装分拣器叠几层、物流站间距、建筑碰撞框……做这个生成器时整理的 {n} 条游戏机制。',
      tipsAll: '看全部 {n} 条',
    },
    en: {
      title: 'Dyson Sphere Program Blueprint Generator',
      lead: [
        'Pick a product and how many you want per minute, and this tool lays out the whole production line as one blueprint. It works out how many smelters and assemblers you need from ore to finished product, places the belts, sorters and power, and gives you a blueprint code to paste into the game.',
        'The layout follows the way players build by hand: one belt per item, machines in rows with belt aisles between the rows, every sorter right next to its machine. Free, runs in your browser, no install and no account.',
      ],
      faqTitle: 'Questions and answers',
      faq: [
        {
          q: 'How do I get the blueprint into the game?',
          a: [
            'When the layout is done, click Copy blueprint; the blueprint code is now on your clipboard. In the game, press Ctrl+V to enter blueprint paste mode, click Paste Blueprint Code on the blueprint panel, then pick a spot and build.',
            'You can also create a new blueprint in the Blueprint Library, paste the code there and save it for later. Blueprints become available in the game once you have researched Mass Construction.',
          ],
        },
        {
          q: 'What can it lay out?',
          a: [
            'Almost anything made in a factory building: iron ingots, circuit boards, processors, all the way up to the six matrices (Electromagnetic, Energy, Structure, Information, Gravity and Universe Matrix, also known as blue to white science). You can add several targets and get them in one blueprint.',
            'It also makes fractionator arrays for deuterium.',
          ],
        },
        {
          q: 'I have not unlocked some of the buildings. Can I change them?',
          a: ['Yes. The buttons above the drawing let you pick the belt, sorter, smelter, assembler, chemical plant and lab, whether to use proliferator, Tesla Towers or Satellite Substations for power, and whether materials come and go by belt, storage or logistics stations. Choose what your save has unlocked.'],
        },
        {
          q: 'Does it support proliferator?',
          a: ['Yes. The last button above the drawing sets the proliferator grade. The blueprint then includes the spray coaters and the belts that feed them.'],
        },
        {
          q: 'Where on the planet can I paste it?',
          a: ['If the line has Chemical Plants or Oil Refineries, the default spacing only fits near the equator. To paste at other latitudes, set "High-latitude spacing for Chemical Plants and refineries" in the left panel to "Any latitude" before you generate.'],
        },
        {
          q: 'The game says the blueprint has too many facilities. What now?',
          a: ['How many facilities one blueprint can place is set by your Mass Construction research level, so a large blueprint will not fit at low levels. Research it further, or lower the rate per minute and build the line as several smaller blueprints.'],
        },
        {
          q: 'How long does it take?',
          a: ['A small line of a few dozen buildings takes seconds to tens of seconds; a few hundred buildings take minutes. The estimate is shown under the Generate blueprint button before you start. The Polished search effort takes longer and aims for a wide layout close to the shape of your screen.'],
        },
        {
          q: 'Can I trust the result?',
          a: ['Every blueprint is checked independently after it is generated: building collisions, belt connections, sorter reach and power coverage. The outcome is listed under Checks. If a layout fails, the page says so and you should not paste it.'],
        },
        {
          q: 'How is this different from downloading a ready-made blueprint?',
          a: ['A ready-made blueprint comes with someone else\'s output rate and choice of buildings. This tool lays out a line for exactly the rate you ask for, with the buildings you have unlocked.'],
        },
        {
          q: 'Is it free? Does it need a connection?',
          a: [`Free and open source (GPL-3.0). The layout is computed in your own browser and your production line is not uploaded. To use it offline, download the repository from [GitHub](${REPO}), unzip it and open en/index.html.`],
        },
        {
          q: 'I only want the ratios, not a blueprint',
          a: ['Use the [production calculator](calc/): pick targets and rates per minute and it lists how many of each building, how much raw material and roughly how much power you need. From there, Generate blueprint brings the line back here.'],
        },
      ],
      tipsTitle: 'Game mechanics notes',
      tipsLead: 'Belt throughput, Pile Sorter stacking, station spacing, collision boxes and more: {n} game mechanics notes collected while building this generator.',
      tipsAll: 'See all {n} notes',
    },
  },
  // 量产计算器：/calc/ 和 /en/calc/
  calc: {
    zh: {
      title: '戴森球计划量产计算器',
      lead: ['选目标物品和每分钟产量，算出整条线每种设备要几台、每种原料每分钟要多少、大约用多少电。算好的产线可以直接交给蓝图生成器，排成能贴进游戏的蓝图。免费，在浏览器里运行，不用安装也不用注册。'],
      faqTitle: '常见问题',
      faq: [
        {
          q: '怎么用？',
          a: ['左边加目标物品、填每分钟产量，右边就是生产清单：每样中间产物每分钟要多少、要几台设备。清单上方那排按钮换传送带、熔炉、制造台这些设备的型号和增产剂，数字跟着变。'],
        },
        {
          q: '「外部」是什么意思？',
          a: ['清单里不想自己造的东西，点那一行右边的「外部」，它就改成从别处运来，不再算它上游的设备和原料。'],
        },
        {
          q: 'D 和 S 两个模式有什么区别？',
          a: ['D 是需求模式，只算整条线要多少。S 是供给模式：每生成一张蓝图，它做的东西就标成已完成、从清单里扣掉，清单剩下的就是还要做的，适合把一条大产线分成几张蓝图慢慢建。'],
        },
        {
          q: '算好了怎么变成蓝图？',
          a: ['在清单里点选要做的物品（可以多选，它要用的东西一起做），点「生成蓝图」，[蓝图生成器](../)会在弹层里打开并填好这条线。点「生成无带蓝图」出的是无带流蓝图。'],
        },
        {
          q: '配方数据从哪来？',
          a: [`配方数据和界面来自[戴森球计划量产量化计算器（DSQ）](${DSQ})，开源（GPL-3.0）。`],
        },
      ],
    },
    en: {
      title: 'Dyson Sphere Program Production Calculator',
      lead: ['Pick target items and a rate per minute to see how many of each building the whole line needs, how much of each raw material per minute, and roughly how much power. You can hand the line straight to the blueprint generator and get a blueprint to paste into the game. Free, runs in your browser, no install and no account.'],
      faqTitle: 'Questions and answers',
      faq: [
        {
          q: 'How do I use it?',
          a: ['Add target items on the left and set a rate per minute. The production list on the right shows how much of every intermediate product you need per minute and how many buildings make it. The buttons above the list change the belt, smelter, assembler and other building tiers and the proliferator, and the numbers follow.'],
        },
        {
          q: 'What does External mean?',
          a: ['If you would rather not make something in the list yourself, click External at the right end of its row. It is then brought in from elsewhere, and the buildings and raw materials upstream of it are no longer counted.'],
        },
        {
          q: 'What is the difference between the D and S modes?',
          a: ['D is demand mode: it just shows what the whole line needs. S is supply mode: every time you generate a blueprint, what it makes is marked Done and taken off the list, so the list shows what is still left to build. That suits building a large line as several blueprints.'],
        },
        {
          q: 'How do I turn the result into a blueprint?',
          a: ['Click the items in the list that you want to build (you can pick several; what they use is built along with them), then click Generate blueprint. The [blueprint generator](../) opens in an overlay with the line filled in. Generate beltless blueprint makes a beltless layout instead.'],
        },
        {
          q: 'Where does the recipe data come from?',
          a: [`The recipe data and the interface come from [DSQ](${DSQ}), an open-source (GPL-3.0) Dyson Sphere Program calculator.`],
        },
      ],
    },
  },
};

// 游戏机制小知识：网站上单独一页（中文 tips/、英文 en/tips/，web/site.js 的 tipsPage），生成器入口页面底下列出问题、链到这一页。
// 内容来自 docs/game-rules.md（实测或读游戏代码得出的；推断的、实测和代码对不上的不写），页面上不标出处。
// id 是网址里的锚点（#id），中英文共用，加了就别改（外面可能链着）；key 是这条的关键数，页面上画成标注尺寸的样子（没有就不写）。
// 两种语言的分组、条目、每条的段数要一样（test/site.test.js 查）。游戏规则改了记得回来改这里。
export const TIPS = {
  zh: {
    title: '戴森球计划游戏机制小知识：传送带、分拣器、物流站、供电',
    name: '戴森球计划游戏机制小知识',
    description: '戴森球计划里传送带运力和叠层、集装分拣器各级叠几层和实际速度、分拣器供电和角度、物流站间距、建筑碰撞框和最小间距、纬度对蓝图的影响、增产剂和分馏塔：26 条排产线、手搓、做蓝图用得上的游戏机制。',
    lead: ['做[戴森球计划蓝图生成器](../)时整理的游戏机制，排产线、手搓、做蓝图都用得上。格数都按赤道算，一格约 1.26 米。'],
    tocTitle: '目录',
    topicsTitle: '分组',
    cta: { label: '打开蓝图生成器', note: '选好产物和每分钟产量，自动排出整条产线的蓝图，照的就是这些规则。' },
    nav: { gen: '蓝图生成器', calc: '量产计算器', other: 'English' },
    groups: [
      {
        id: 'belts',
        title: '传送带',
        items: [
          {
            id: 'belt-throughput',
            key: '7200/分',
            q: '一条传送带最多能运多少？',
            a: [
              '一层货物时，极速传送带每秒 30 个（每分钟 1800），高速传送带每秒 12 个（720），传送带每秒 6 个（360）。货物最多叠 4 层，满叠的极速传送带每分钟 7200 个。',
              '往带上叠层要靠集装分拣器、自动集装机或物流站出货，普通、高速、极速分拣器放到带上的都是一层。',
            ],
          },
          {
            id: 'belt-over-buildings',
            key: '≥ 3 层',
            q: '传送带能从建筑头顶过吗？',
            a: ['能。蓝图里抬高的传送带可以从这些建筑头顶过，能过的最低高度：电弧熔炉、单层矩阵研究站、化工厂本体 3 层（化工厂左边那根塔要 5 层），制造台 Mk.III 约 3.6 层，电力感应塔 4.5 层，小型储物仓 2 层。卫星配电站上面有个比底座宽的顶盘，正上方要 5.5 层，离中心 2 格那一圈在顶盘底下，最高只能到 4 层。传送带也能从分拣器上方过。'],
          },
          {
            id: 'belt-slope',
            q: '为什么贴蓝图时报传送带「坡度太陡」？',
            a: ['原地竖直升降的传送带（垂直传送带）和一格升一层的陡坡，都要先研究「超级磁场发生器」，它解除传送带的坡度限制；没研究时贴这种蓝图会报坡度太陡。生成器出的图用没用到这两种，写在「检查」里。'],
          },
          {
            id: 'half-level-belts',
            key: '0.5 层',
            q: '蓝图里的传送带能放在半层高吗？会不会互相撞？',
            a: [
              '能。贴蓝图时传送带的高度原样照用，不往整层上凑，所以蓝图里可以有半层高的带子：一格的小坡抬半层跨过旁边几条地面带、两条带在同一格上下叠着走，都能贴、料照走。手拉传送带横穿别的带子时，游戏也是自己把那一节抬高半层。',
              '同一张蓝图里的传送带之间游戏不查碰撞：两条带在同一格交叉穿过也贴得上，只是会穿模。自己做蓝图时，同一格里的两条带上下最好隔开半层。',
            ],
          },
          {
            id: 'belt-port-height',
            key: '≤ 4 m',
            q: '接物流站的传送带能抬多高？',
            a: ['传送带接建筑的那一节，离建筑中心不能超过 4 米。物流站的站口那一节离站心约 2.24 格，所以它放在 0.5、1、2 层都能接，2.5 层就太远了；站口往外 3 节以内的带子可以在站身范围里抬高。'],
          },
        ],
      },
      {
        id: 'sorters',
        title: '分拣器',
        items: [
          {
            id: 'sorter-length',
            key: '360 / 180 / 120',
            q: '分拣器越长越慢吗？取叠层的料会更快吗？',
            a: [
              '分拣器能跨 1~3 格，越长每趟来回越久。按每趟一个货物算，极速分拣器长 1、2、3 格每分钟约 360、180、120 个，高速分拣器 180、90、60，分拣器 90、45、30，集装分拣器 600、300、150。',
              '从传送带上取料时，分拣器一次拿走整个货物：带上的货物叠了 4 层，一趟就是 4 个。所以给工厂喂料的带子先叠好层，同一根分拣器能多送几倍。',
            ],
          },
          {
            id: 'pile-sorter-stack',
            key: '4 层',
            q: '集装分拣器往带上能叠几层？',
            a: [
              '看「集装分拣器改良」科技：没研究时一层，1 级 2 层、3 级 3 层、5 级 4 层，一条极速传送带分别能到每分钟 3600、5400、7200。它往带上放货时，还会把插入点前后已有的同种货物补到这么多层。',
              '物流站往带上出货叠几层是另一项科技「运输站集装物流」管的，和集装分拣器无关。',
            ],
          },
          {
            id: 'pile-sorter-speed',
            q: '集装分拣器实际每分钟能送多少？',
            a: [
              '常见速度表上的 600、300、150 是按每趟一个算的名义值，实际快得多。从建筑往极速传送带出货，长 1、2、3 格每分钟：没研究「集装分拣器改良」时约 800、480、343，1 级 1029、554、379，3 级 1350、771、540，5 级 1600、960、686；6 级双向运送，约 7200，不看长度。',
              '从满带取料进建筑（单层货物）：长 1、2、3 格每分钟，0~1 级约 899、513、359，4~5 级 1027、719、553；货物叠 2 层、4 层就再乘 2、4。带上这种料稀疏时取得慢得多。',
            ],
          },
          {
            id: 'sorter-power',
            q: '很长的分拣器为什么有时没电？',
            a: ['分拣器的电源插头在它取料的那一头。从带子往工厂送料的分拣器，要带子那头落在电力感应塔或卫星配电站的范围里；从工厂往带子出货的，看工厂那头。长 3 格的分拣器两头差得远，供电要照取料那头放。'],
          },
          {
            id: 'sorter-angle',
            key: '24°',
            q: '分拣器接高处的带子为什么贴不上？',
            a: ['贴蓝图时，分拣器工厂那头会吸到工厂的接口上，带子那头留在带子的格子上；两头连线和两头朝向的夹角超过 24° 游戏就不让建。所以长 1 的分拣器从半层高的带子往制造台取料不行（约 25°）。离开赤道东西方向的格子变窄，东西向的分拣器跟着变短变斜，赤道上刚好能接的，到高纬度可能就不行了。'],
          },
        ],
      },
      {
        id: 'piling',
        title: '集装、喷涂和分馏',
        items: [
          {
            id: 'piler',
            key: '1 → 2 → 4',
            q: '自动集装机能把货物叠到 4 层吗？',
            a: [
              '一台只把相邻的两个货物合成一个：一层进来出两层，两层进来出四层，不会一台直接叠到四层；后一个货物要紧跟着到，满带才合得上。同一种带上两台紧挨着串联，第二台基本没用。放的时候前后各留一格直带，不能放在高架的带子上。',
              '集装机本身没有等级，最多叠 4 层是写死的，「运输站集装物流」科技管的只是物流站。没通电或电不够时，货物原样通过、不叠。',
            ],
          },
          {
            id: 'proliferator',
            key: '12 / 24 / 60',
            q: '增产剂要怎么喷才有效？',
            a: [
              '一台工厂的原料要每一种都喷过才有效果；几种原料喷的等级不同，按最低的算；有一种没喷就完全没效果，喷了的那些照样消耗。工厂产出的东西不带增产剂，每一道工序的原料都得重新喷。一个增产剂能喷的次数：Mk.I 12 次、Mk.II 24 次、Mk.III 60 次。',
              '喷涂机要骑在直的传送带上：它压着的 3 格不能转弯、不能升降，再往外各一格也要顺着同一方向，最近到第 2 格才能转弯或升降。',
            ],
          },
          {
            id: 'spray-coater-stack',
            q: '喷涂机能叠起来吗？给喷涂机送增产剂的带子怎么接？',
            a: [
              '能。同一格里可以上下叠几台喷涂机，每台骑在自己那一层的传送带上，增产剂带在各自上方一层横穿；喷涂机不能悬空，下面得有带子或另一台喷涂机。高架的带子上也能骑喷涂机。',
              '增产剂带从喷涂机背后那格上方横穿过去就行；只从一侧伸到那格上方就断掉的（死胡同）也行，喷涂机照样取得到。',
            ],
          },
          {
            id: 'fractionator',
            key: '2%',
            q: '一座分馏塔能出多少重氢？',
            a: [
              '分馏的概率不喷增产剂 1%，喷 Mk.II 1.5%，喷 Mk.III 2%。一座塔流过的氢最多接近满叠的极速传送带，每分钟约 7200 个，所以喷 Mk.III 时一座塔每分钟约 144 个重氢。60 座塔的阵列约每分钟 8640 个，正好是 60 × 7200 × 2%。',
              '阵列里给喷涂机用的增产剂，物流站那一格要设成「需求」：设成「供应」的格子，物流运输机、星际物流运输船不往里送。',
              '分馏塔窗口最下面那行是这座塔建好以来累计的「产物数 / 处理总数」，就是它实际的转化率。',
            ],
          },
          {
            id: 'traffic-monitor',
            q: '流速监测器怎么数？蓝图里的监测器为什么没挂上带子？',
            a: [
              '流速监测器数的是物品个数：叠了 4 层的一个货物算 4 个，满叠的极速传送带显示每分钟 7200。可以设成只数一种物品。',
              '蓝图里不记监测器挂在哪条带上，建好时它挂到 1 米以内、顺着它朝向那条线 0.3 米以内最近的传送带节点。所以监测器要和那节带子在同一格、同样高，朝向顺着带子。',
            ],
          },
        ],
      },
      {
        id: 'power',
        title: '供电',
        items: [
          {
            id: 'power-range',
            key: '8 / 21 格',
            q: '电力感应塔、卫星配电站能供到多远？',
            a: [
              '看建筑的中心点在不在供电范围里，不是看建筑边上碰没碰到。电力感应塔供到中心离它约 8 格的建筑，卫星配电站约 21 格（官方写的是 10 米、26 米）。两座电力感应塔中心隔 17 格还连得上，隔 18 格就断了（官方 22 米）。',
              '电力感应塔能塞进同一排两台制造台中间 1 格宽的缝里，Mk.I 到重组式制造台都行。',
            ],
          },
          {
            id: 'thermal-power',
            key: '2.16 MW',
            q: '火力发电厂烧好燃料能多发电吗？',
            a: ['不能。一台火力发电厂的功率是固定的，燃料只决定能烧多久；物品说明里的「发电加成」只对机甲有用。只有燃料本身喷了增产剂，发电功率才会提高（Mk.III 加 25%）。'],
          },
        ],
      },
      {
        id: 'stations',
        title: '物流站和仓储',
        items: [
          {
            id: 'station-distance',
            key: '29 m',
            q: '两座物流站最近能挨多近？',
            a: ['量的是两座站中心的直线距离：有星际物流运输站的一对至少 29 米，赤道上约 23.1 格（24 格能建、23 格不行）；两座行星内物流运输站至少 15 米。东西方向的格子离赤道越远越窄，东西挨着的两座站要多留几格：东西隔 25 格的两座星际站贴到离赤道远些的地方就报太近，隔 27 格能放。'],
          },
          {
            id: 'station-same-item',
            q: '同一种东西既要运进来、又有副产出，能放在同一座物流站吗？',
            a: ['最好分开。比如产线要用氢，石墨烯（高效）又副产氢：两条带都接到同一座站的氢那一格，从别处运来的氢把格子装满以后，副产的氢就送不进去，出它的那组工厂会停。供应和需求放两座站。'],
          },
          {
            id: 'station-no-sorters',
            key: '12 个站口',
            q: '分拣器能直接从物流站取货吗？',
            a: ['不能。星际物流运输站和行星内物流运输站都没有分拣器的接口，进出只走四边的 12 个站口，每个口接一条传送带。'],
          },
          {
            id: 'tank-and-distributor',
            q: '储液罐、物流配送器怎么接？',
            a: ['储液罐不用分拣器，传送带直接接在罐的四边；罐叠起来时，带子只接最下面那个。物流配送器放在储物仓顶上（叠了几层就放在最上面那个上），管的是下面那叠仓。'],
          },
        ],
      },
      {
        id: 'buildings',
        title: '建筑、碰撞和纬度',
        items: [
          {
            id: 'latitude',
            key: '28.8°',
            q: '为什么蓝图在赤道能贴，换个纬度就撞？',
            a: [
              '星球上的格子南北方向一样宽，东西方向越往两极越窄：一圈的格数按纬度分段变少（半径 200 的星球赤道一圈 1000 格，28.8° 起 800 格，46.8° 起 600 格……），同一段里越往北格子也越窄。建筑大小不变，蓝图里东西方向隔几格，贴到高纬度就是隔几个窄格子，挨得紧的建筑就撞上了。化工厂并排隔 7 格只在赤道附近放得下，要隔 8 格才哪儿都能放。',
              '一张蓝图还得整张落在同一个纬度段里，所以南北越长的蓝图能贴的纬度越窄：超过 50 行的只能贴在南北纬 28.8° 以内。',
            ],
          },
          {
            id: 'building-spacing',
            key: '3 / 4 / 7 格',
            q: '建筑之间最紧能挨多近？',
            a: [
              '中心到中心的格数（赤道上）：电弧熔炉并排隔 3；两台制造台隔 4，制造台挨着熔炉或卫星配电站时隔 3 就行；原油精炼厂并排隔 3；化工厂隔 7（隔 6 撞）；矩阵研究站隔 5；微型粒子对撞机隔 9。上下两行制造台之间只留 1 格宽的传送带通道也不撞。两座卫星配电站斜着靠近也会撞，因为上面的顶盘比底座宽。离开赤道，东西方向会变挤（见上面纬度那条）。',
              '矩阵研究站能叠几层看「垂直建造」科技：1~6 级分别是 5、7、9、11、13、15 层。',
            ],
          },
          {
            id: 'collider-sizes',
            key: '3.04 格',
            q: '各种建筑的碰撞框到底多大？',
            a: ['游戏数据里建造盒的尺寸（单位：格），比画在地上的占地更准：制造台 3.04 见方，所以两台中心隔 3 会撞、要隔 4；电弧熔炉 2.31；化工厂 6.61 × 3.50，量子化工厂和它一样大；原油精炼厂 2.79 × 5.73；微型粒子对撞机 8.20 × 4.71；分馏塔 3.58 见方，比 3×3 的格子每边多出约 0.3 格；物流站是 6.37 格宽的十字形，四个角空着；卫星配电站底座只有 2.12 × 2.39，但离地 6~7 米有个 5.49 格见方的顶盘，所以两座配电站斜着靠近也会撞。'],
          },
          {
            id: 'paste-collision',
            key: '3.5 m',
            q: '贴蓝图时游戏怎么判断撞没撞？',
            a: [
              '每个建筑有几个看不见的建造盒，贴蓝图时拿它和别的建筑的建造盒做精确的相交判断，没有余量，压进去一点也算撞。传送带只按节点上方 0.2 米处一个半径 0.23 米的小球查；分拣器只和分拣器互撞，不管传送带和它两头接的东西。',
              '另外还有两条按距离判的：供电设施（电力感应塔、卫星配电站、发电厂等）中心之间至少 3.5 米，物流站之间见上面那条。',
            ],
          },
        ],
      },
      {
        id: 'beltless',
        title: '无带流蓝图',
        items: [
          {
            id: 'beltless-repaste',
            key: '√5 m',
            q: '无带流蓝图贴下去，分拣器没连上怎么办？',
            a: [
              '分拣器隔空连传送带的无带流蓝图，贴下去建好一遍以后，把整片拆掉、在原地再贴一次，分拣器才会全部连上。接了物流站的，重贴时留着站和站口那几节带子。',
              '原因是：分拣器建好时，离它连着的传送带超过 √5 米（约 2.2 米）的连接会被断掉；整片重贴时，新建的传送带会把所有连接重新接一遍。',
            ],
          },
        ],
      },
    ],
  },
  en: {
    title: 'Dyson Sphere Program Game Mechanics: Belts, Sorters, Stations, Power',
    name: 'Dyson Sphere Program game mechanics',
    description: 'Belt throughput and stacking, Pile Sorter stack height and real speed per level, sorter power and angles, logistics station spacing, building collision boxes and minimum spacing, how latitude affects blueprints, proliferator and fractionators: 26 Dyson Sphere Program mechanics notes for laying out lines, building by hand and making blueprints.',
    lead: ['Game mechanics collected while building the [DSP Blueprint Generator](../), useful whether you lay out lines, build by hand or make blueprints. Distances in cells are at the equator, where one cell is about 1.26 m.'],
    tocTitle: 'Contents',
    topicsTitle: 'Topics',
    cta: { label: 'Open the blueprint generator', note: 'Pick a product and a rate per minute and it lays out the whole line as a blueprint, following these rules.' },
    nav: { gen: 'Blueprint generator', calc: 'Production calculator', other: '中文' },
    groups: [
      {
        id: 'belts',
        title: 'Belts',
        items: [
          {
            id: 'belt-throughput',
            key: '7,200/min',
            q: 'How much can one belt carry?',
            a: [
              'With single-layer cargo, Conveyor Belt Mk.III moves 30 items per second (1,800 per minute), Mk.II 12 per second (720) and Mk.I 6 per second (360). Cargo stacks up to 4 high, so a fully stacked Mk.III belt carries 7,200 per minute.',
              'Stacking comes from Pile Sorters, Automatic Pilers or logistics station output; Sorter Mk.I, Mk.II and Mk.III always put single items on the belt.',
            ],
          },
          {
            id: 'belt-over-buildings',
            key: 'level 3+',
            q: 'Can a belt pass over buildings?',
            a: ['Yes. A raised belt in a blueprint can pass over these buildings, at these lowest heights: Arc Smelter, single Matrix Lab and the Chemical Plant body at level 3 (the tower on the Chemical Plant\'s left side needs level 5), Assembling Machine Mk.III at about level 3.6, Tesla Tower at level 4.5, Depot Mk.I at level 2. A Satellite Substation has a top disc wider than its base: right above it you need level 5.5, and the ring 2 cells from its center sits under the disc, so belts there can go no higher than level 4. Belts can also pass over sorters.'],
          },
          {
            id: 'belt-slope',
            q: 'Why does the game say a belt slope is too steep?',
            a: ['Belts that rise straight up in place (vertical belts) and slopes that climb one level per cell both need the Super Magnetic Field Generator research, which lifts the belt slope limit. Without it, pasting such a blueprint fails with a slope-too-steep error. The Checks list for a generated blueprint says whether it uses either.'],
          },
          {
            id: 'half-level-belts',
            key: '0.5 level',
            q: 'Can blueprint belts sit at half levels? Do they collide with each other?',
            a: [
              'Yes. When a blueprint is pasted, belt heights are used as stored, not rounded to whole levels, so a blueprint can hold belts at half levels: a one-cell ramp that lifts half a level over neighboring ground belts, or two belts stacked in one cell, both paste and carry items. When you drag a belt across another by hand, the game itself lifts that piece half a level.',
              'The game does not check belts in the same blueprint against each other: two belts crossing through the same cell still paste, they just clip. If you make blueprints yourself, keep two belts in one cell at least half a level apart.',
            ],
          },
          {
            id: 'belt-port-height',
            key: '≤ 4 m',
            q: 'How high can the belt at a logistics station port be?',
            a: ['The belt piece that connects to a building may be at most 4 m from the building\'s center. A station\'s port piece is about 2.24 cells from the station center, so it can sit at level 0.5, 1 or 2, but level 2.5 is too far. Within 3 pieces out from the port, belts may rise inside the station\'s footprint.'],
          },
        ],
      },
      {
        id: 'sorters',
        title: 'Sorters',
        items: [
          {
            id: 'sorter-length',
            key: '360 / 180 / 120',
            q: 'Are longer sorters slower? Is picking stacked cargo faster?',
            a: [
              'A sorter can reach 1 to 3 cells, and the longer it is, the longer each round trip takes. Counting one item per trip, Sorter Mk.III moves about 360, 180 and 120 per minute at lengths 1, 2 and 3; Mk.II 180, 90 and 60; Mk.I 90, 45 and 30; the Pile Sorter 600, 300 and 150.',
              'When a sorter picks from a belt it takes the whole piece of cargo: if the cargo is stacked 4 high, one trip moves 4 items. Stack the input belt first and the same sorter feeds a machine several times faster.',
            ],
          },
          {
            id: 'pile-sorter-stack',
            key: '4 high',
            q: 'How high does a Pile Sorter stack items on a belt?',
            a: [
              'That depends on the Pile Sorter Upgrade research: 1 high before any research, 2 at level 1, 3 at level 3 and 4 at level 5, so a Mk.III belt reaches 3,600, 5,400 or 7,200 per minute. When it drops an item, it also tops up nearby cargo of the same item to that height.',
              'How high a logistics station stacks its output is a different research, Station Integrated Logistics, and has nothing to do with Pile Sorters.',
            ],
          },
          {
            id: 'pile-sorter-speed',
            q: 'How many items per minute does a Pile Sorter really move?',
            a: [
              'The usual figures of 600, 300 and 150 are nominal, counting one item per trip; the real rates are much higher. From a building onto a Mk.III belt, at lengths 1, 2 and 3, per minute: about 800, 480 and 343 with no Pile Sorter Upgrade; 1,029, 554 and 379 at level 1; 1,350, 771 and 540 at level 3; 1,600, 960 and 686 at level 5; and about 7,200 at level 6, which moves both ways and no longer depends on length.',
              'From a full belt into a building, with single-layer cargo, at lengths 1, 2 and 3 per minute: about 899, 513 and 359 at levels 0 and 1, and 1,027, 719 and 553 at levels 4 and 5; multiply by 2 or 4 when the cargo is stacked 2 or 4 high. When that item is sparse on the belt, picking is much slower.',
            ],
          },
          {
            id: 'sorter-power',
            q: 'Why does a long sorter sometimes have no power?',
            a: ['A sorter\'s power plug is at the end it picks from. A sorter that takes from a belt into a machine needs the belt end inside a Tesla Tower or Satellite Substation range; one that takes from a machine onto a belt needs the machine end covered. The two ends of a 3-cell sorter are far apart, so place power around the end it picks from.'],
          },
          {
            id: 'sorter-angle',
            key: '24°',
            q: 'Why will a sorter not connect to a raised belt?',
            a: ['When a blueprint is pasted, the machine end of a sorter snaps to the machine\'s slot while the belt end stays on its cell; if the line between them is more than 24° off either end\'s facing, the game will not build it. So a length-1 sorter cannot take from a belt half a level up into an assembler (about 25°). East-west cells narrow away from the equator, so east-west sorters get shorter and steeper, and one that just fits at the equator may fail at higher latitude.'],
          },
        ],
      },
      {
        id: 'piling',
        title: 'Piling, proliferator and fractionators',
        items: [
          {
            id: 'piler',
            key: '1 → 2 → 4',
            q: 'Can an Automatic Piler stack cargo 4 high?',
            a: [
              'One piler only merges two neighboring pieces of cargo into one: single items come out 2 high, 2-high cargo comes out 4 high, so one piler never goes straight to 4; the second piece has to follow right behind, which only happens on a full belt. Two pilers back to back on the same belt type: the second one does almost nothing. Leave one straight belt cell before and after a piler, and do not put it on a raised belt.',
              'The piler itself has no tiers; the 4-high cap is fixed in the code, and the Station Integrated Logistics research only affects stations. An unpowered or underpowered piler lets cargo pass through unstacked.',
            ],
          },
          {
            id: 'proliferator',
            key: '12 / 24 / 60',
            q: 'How does proliferator have to be sprayed to work?',
            a: [
              'Every input of a machine must be sprayed for any bonus. If inputs are sprayed at different grades, the lowest counts; if one input is not sprayed at all, there is no bonus, and the sprayed inputs are still used up. Products come out unsprayed, so each stage\'s inputs need spraying again. One proliferator item sprays 12 times for Mk.I, 24 for Mk.II and 60 for Mk.III.',
              'A Spray Coater sits on a straight belt: the 3 cells it covers cannot turn or change height, and one more cell on each side must continue in the same direction, so the nearest turn or height change is 2 cells away.',
            ],
          },
          {
            id: 'spray-coater-stack',
            q: 'Can Spray Coaters be stacked? How should the proliferator belt reach them?',
            a: [
              'Yes. Several Spray Coaters can stack in one cell, each riding the belt on its own level with the proliferator belt crossing one level above it. A coater cannot float: there must be a belt or another coater below it. Coaters can also ride raised belts.',
              'The proliferator belt just has to cross over the cell behind the coater. A dead end that reaches over that cell from one side and stops there also works.',
            ],
          },
          {
            id: 'fractionator',
            key: '2%',
            q: 'How much Deuterium does one Fractionator make?',
            a: [
              'The conversion chance is 1% without proliferator, 1.5% with Mk.II and 2% with Mk.III. Hydrogen flows through one Fractionator at up to about a fully stacked Mk.III belt, roughly 7,200 per minute, so with Mk.III one Fractionator makes about 144 Deuterium per minute. A 60-tower array makes about 8,640 per minute, exactly 60 × 7,200 × 2%.',
              'For the proliferator that feeds the coaters in an array, set that station slot to Demand: Logistics Drones and Interstellar Logistics Vessels do not deliver into a Supply slot.',
              'The bottom row of a Fractionator\'s window is the running total of products over items processed since it was built, which is its actual conversion rate.',
            ],
          },
          {
            id: 'traffic-monitor',
            q: 'How does the Traffic Monitor count? Why did a pasted monitor not attach to its belt?',
            a: [
              'The Traffic Monitor counts items: one piece of cargo stacked 4 high counts as 4, so a fully stacked Mk.III belt reads 7,200 per minute. It can be set to count only one item.',
              'A blueprint does not store which belt a monitor watches. When built, it attaches to the nearest belt node within 1 m and within 0.3 m of the line it faces. So put the monitor in the same cell as the belt piece, at the same height, facing along the belt.',
            ],
          },
        ],
      },
      {
        id: 'power',
        title: 'Power',
        items: [
          {
            id: 'power-range',
            key: '8 / 21 cells',
            q: 'How far do Tesla Towers and Satellite Substations reach?',
            a: [
              'What counts is whether the building\'s center is within range, not whether its edge touches it. A Tesla Tower powers buildings whose center is up to about 8 cells away, a Satellite Substation about 21 cells (the official figures are 10 m and 26 m). Two Tesla Towers 17 cells apart still connect; at 18 cells they do not (officially 22 m).',
              'A Tesla Tower fits into the 1-cell gap between two assemblers in the same row, from Assembling Machine Mk.I to the Re-composing Assembler.',
            ],
          },
          {
            id: 'thermal-power',
            key: '2.16 MW',
            q: 'Does a Thermal Power Plant make more power with better fuel?',
            a: ['No. A Thermal Power Plant has a fixed power output; the fuel only decides how long it burns. The energy bonus in the item description applies only to the mecha. Only fuel that has itself been sprayed with proliferator raises the plant\'s output (Mk.III adds 25%).'],
          },
        ],
      },
      {
        id: 'stations',
        title: 'Logistics stations and storage',
        items: [
          {
            id: 'station-distance',
            key: '29 m',
            q: 'How close can two logistics stations be?',
            a: ['The game measures the straight-line distance between station centers: at least 29 m when either is an Interstellar Logistics Station, which is about 23.1 cells at the equator (24 cells works, 23 does not), and at least 15 m between two Planetary Logistics Stations. East-west cells narrow away from the equator, so stations side by side east to west need a few extra cells: two Interstellar Logistics Stations 25 cells apart east to west were too close when pasted farther from the equator, and 27 cells apart was fine.'],
          },
          {
            id: 'station-same-item',
            q: 'Can a station both import an item and take the same item as a byproduct?',
            a: ['Better not. Say the line uses Hydrogen and Graphene (advanced) also makes Hydrogen as a byproduct. If both belts go to the Hydrogen slot of the same station, imported Hydrogen fills the slot, the byproduct can no longer go in, and the machines making it stop. Put supply and demand in two different stations.'],
          },
          {
            id: 'station-no-sorters',
            key: '12 ports',
            q: 'Can a sorter take items straight from a logistics station?',
            a: ['No. Neither the Interstellar nor the Planetary Logistics Station has sorter slots; items go in and out only through the 12 ports around its sides, one belt per port.'],
          },
          {
            id: 'tank-and-distributor',
            q: 'How do Storage Tanks and Logistics Distributors connect?',
            a: ['A Storage Tank needs no sorters: belts connect straight to its four sides, and when tanks are stacked, belts connect only to the bottom one. A Logistics Distributor sits on top of a depot (on the topmost one when depots are stacked) and serves that stack.'],
          },
        ],
      },
      {
        id: 'buildings',
        title: 'Buildings, collisions and latitude',
        items: [
          {
            id: 'latitude',
            key: '28.8°',
            q: 'Why does a blueprint fit at the equator but collide at another latitude?',
            a: [
              'Cells on a planet are equally tall north to south, but narrower east to west the farther you go from the equator. The number of cells around the planet drops in latitude bands (on a radius-200 planet: 1,000 at the equator, 800 from 28.8°, 600 from 46.8°, and so on), and cells also narrow within each band. Buildings keep their size, so buildings packed a given number of cells apart east to west end up closer together at high latitude and can collide. Chemical Plants side by side 7 cells apart only fit near the equator; 8 cells apart fit almost anywhere.',
              'A blueprint must also lie entirely within one latitude band, so the taller a blueprint is north to south, the fewer latitudes it can go to: one taller than 50 rows only fits within 28.8° of the equator.',
            ],
          },
          {
            id: 'building-spacing',
            key: '3 / 4 / 7 cells',
            q: 'How tightly can buildings be packed?',
            a: [
              'Center-to-center distances in cells at the equator: Arc Smelters side by side 3; two assemblers 4, or 3 when an assembler is next to a smelter or a Satellite Substation; Oil Refineries side by side 3; Chemical Plants 7 (6 collides); Matrix Labs 5; Miniature Particle Colliders 9. Two rows of assemblers with only a 1-cell belt aisle between them do not collide. Two Satellite Substations collide even diagonally close, because the top disc is wider than the base. Away from the equator, east-west spacing gets tighter (see the latitude note above).',
              'How high Matrix Labs stack depends on Vertical Construction: levels 1 to 6 allow 5, 7, 9, 11, 13 and 15.',
            ],
          },
          {
            id: 'collider-sizes',
            key: '3.04 cells',
            q: 'How big are the buildings\' collision boxes?',
            a: ['Build box sizes from the game data, in cells, which are more exact than the footprint drawn on the ground: Assembling Machine 3.04 square, so two assemblers 3 cells apart collide and need 4; Arc Smelter 2.31; Chemical Plant 6.61 × 3.50, and the Quantum Chemical Plant is the same size; Oil Refinery 2.79 × 5.73; Miniature Particle Collider 8.20 × 4.71; Fractionator 3.58 square, about 0.3 cells wider than its 3×3 footprint on each side; logistics stations are a cross 6.37 cells across with empty corners; a Satellite Substation\'s base is only 2.12 × 2.39, but 6 to 7 m up it has a top disc 5.49 cells square, which is why two substations collide even diagonally close.'],
          },
          {
            id: 'paste-collision',
            key: '3.5 m',
            q: 'How does the game decide whether a pasted blueprint collides?',
            a: [
              'Every building has a few invisible build boxes. When you paste, the game tests them exactly against other buildings\' boxes with no margin, so even a slight overlap counts. Belts are checked only with a small sphere of radius 0.23 m, 0.2 m above each node. Sorters only collide with other sorters, not with belts or the things they connect.',
              'Two distance rules come on top: power facilities (Tesla Towers, Satellite Substations, power plants and so on) need at least 3.5 m between centers, and logistics stations follow the rule above.',
            ],
          },
        ],
      },
      {
        id: 'beltless',
        title: 'Beltless blueprints',
        items: [
          {
            id: 'beltless-repaste',
            key: '√5 m',
            q: 'The sorters in a beltless blueprint did not connect. What now?',
            a: [
              'For a beltless blueprint, where sorters link straight to belts across a gap, build it once, then dismantle the whole area and paste it again in the same place; only then do all the sorters connect. If it connects to logistics stations, keep the stations and the few belt pieces at their ports when you paste again.',
              'The reason: when a sorter is built, its link to a belt more than √5 m (about 2.2 m) away is dropped; when the belts are pasted again, the new belts redo all their links.',
            ],
          },
        ],
      },
    ],
  },
};
