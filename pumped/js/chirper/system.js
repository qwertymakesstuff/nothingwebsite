// Chirper system accounts (news, alerts, officials, the platform itself), the pool of filler bots
// that pad out reply sections, and the shared lines used for hindsight, regimes and trends.

// System accounts post news and alerts; they are not part of the celebrity cast.
export const SYSTEM = [
  { id: 'news', name: 'Chirper Breaking', handle: 'chirperbreaking', avatar: '📰', color: '#0891b2', verified: 'gold', followers: 31e6, news: true,
    bio: 'Breaking market news, faster than you can panic sell.',
    posts: ["Markets open. Everyone pretend you have a plan.", "Reminder: our alerts are fast. Your thumbs are not.", "Today in markets: numbers moved. More at 11."] },
  { id: 'whale', name: 'Whale Watcher 🐋', handle: 'whalewatcherbot', avatar: '🐋', color: '#0369a1', verified: null, followers: 950e3, news: true,
    bio: 'Automated alerts when big wallets move. Beep boop. Not advice.',
    posts: ["🚨 Whale alert: a wallet just moved a suspicious amount of {asset}", "🐋 Large {asset} transfer detected. Could be nothing. Could be everything.", "🚨 Wallet '0xDEAD…BEEF' bought {asset} again"] },
  { id: 'rugradar', name: 'RugRadar', handle: 'rugradar', avatar: '🧶', color: '#be123c', verified: null, followers: 420e3, news: true,
    bio: 'Tracking rug pulls so you don\'t have to (you will anyway).',
    posts: ["Reminder: if the devs are anonymous and the logo is a dog, check twice.", "Rug count this week: yes.", "Before you ape: who holds the supply? (It's usually the devs.)"] },
  { id: 'fed', name: 'Fed Chair Marla Hawke', handle: 'chairhawke', avatar: '🏛️', color: '#334155', verified: 'grey', followers: 5.2e6, cast: 'Fed Chair Marla Hawke',
    bio: 'Official account. We remain data-dependent. Posts are not hints. Probably.',
    posts: ["We remain data-dependent.", "Our next meeting will be very boring. Do not read into this post.", "We are watching the data closely. And the memes.", "Inflation is a journey, not a destination."] },
  { id: 'sfc', name: 'Securities & Feelings Commission', handle: 'sfc_gov', avatar: '⚖️', color: '#1e3a8a', verified: 'grey', followers: 1.8e6, cast: 'the Securities & Feelings Commission',
    bio: 'Protecting investors from themselves. Official account.',
    posts: ["Reminder: if it sounds too good to be true, it is a meme coin.", "Investor alert: a frog with a hat is not a licensed advisor.", "Celebrities are paid to promote coins. Their excitement is a line item.", "Please stop asking us if a coin is 'legit'. Read the disclosures. There are no disclosures. That's the answer."] },
  { id: 'beige', name: 'Sen. Hal Beige', handle: 'senhalbeige', avatar: '🧓', color: '#a8a29e', verified: 'grey', followers: 310e3, cast: 'Senator Hal Beige',
    bio: 'Proudly serving since 1971. Chair of the Committee on Computers and Such.',
    posts: ["Is the blockchain a series of tubes? My staff will not tell me.", "Held a hearing on cryptocurrency. Fell asleep. Productive day.", "Asked my intern to print out the internet. Waiting.", "I have been informed about $MOONCAT. I do not like it.", "We will be introducing a bill to ban something. Details to follow when I find out what."] },
  { id: 'vibes', name: 'Ministry of Vibes', handle: 'ministryofvibes', avatar: '🌈', color: '#8b5cf6', verified: 'grey', followers: 720e3, cast: 'the Ministry of Vibes',
    bio: 'Official government department of vibes. Vibes are currently: under review.',
    posts: ["Today's official vibe: cautiously sideways.", "Vibe check: market fails.", "The Ministry has declared this a 'mid' week.", "Vibes are being monitored closely. Please remain calm and slightly optimistic."] },
  { id: 'chirper', name: 'Chirper', handle: 'chirper', avatar: '🐤', color: '#38bdf8', verified: 'gold', followers: 210e6,
    bio: 'The official account of Chirper. We value your engagement. We value it at $CHIRP.',
    posts: ["New feature: you can now argue in threads within threads. You're welcome.", "We're aware some posts were moving markets. We've decided this is a feature.", "Reminder to be kind online. (Engagement is down when you're kind. Please be a little mean.)", "Chirper Premium: verified checkmark, edit button and a small sense of superiority."] },
];

export const BOT_HANDLES = [
  'MoonBoi420', 'ApeTogetherStrong', 'BagHolderBrian', 'xX_Diamond_Xx', 'TendieTitan', 'WAGMI_Wendy', 'NGMI_Nathan', 'GmGmGm', 'ChartWizard77', 'FOMOFrankie',
  'RugSurvivor', 'BuyTheDipDan', 'SellTheRipRita', 'LamboOrBust', 'RamenNoodleRich', 'StonksOnlyGoUp', 'PaperHandsPete', 'HodlHelen', 'SatoshiFan2009', 'CryptoCowboy',
  'DegenDave', 'LeverageLarry', 'LiquidatedLiam', 'ShortSqueezeSue', 'GreenCandleGreg', 'RedCandleRon', 'WhaleWannabe', 'ShrimpCapital', 'NotFinancialAdvice', 'DYOR_Dorothy',
  'AltSeasonAndy', 'BearMarketBob', 'BullishBetty', 'CopiumDealer', 'HopiumHarry', 'ExitLiquidity', 'ApeInAlex', 'MaxPainMax', 'TopSignalTom', 'BottomFisherBea',
  'CandleSniffer', 'FibonacciFred', 'ElliottWaveEd', 'HeadAndShouldersHal', 'CupAndHandleCarl', 'DeadCatDiana', 'FlashCrashFiona', 'MooningMona', 'RektRachel', 'GigaBrainGus',
  'SmolBrainSam', 'WifeChangingMoney', 'MomsBasementCapital', 'DadsCreditCard', 'StudentLoanYOLO', 'RentMoneyRandy', 'TaxRefundTrader', 'PizzaFundManager', 'CouchCapitalLLC', 'GarageHedgeFund',
  'Wagie_Willy', 'OfficeChairDegen', 'NightShiftTrader', '3amChartChecker', 'InsomniacInvestor', 'CoffeeAndCandles', 'TradingFromTheBus', 'BathroomBreakTrades', 'LunchBreakLong', 'MeetingMuteMike',
  'gm_enjoyer', 'ser_please', 'fren_of_frogs', 'wen_lambo', 'wen_moon_ser', 'probably_nothing', 'few_understand', 'this_is_fine_dog', 'up_only_guy', 'down_only_gal',
  'TheRealSatoshi_v2', 'TotallyNotADev', 'DefinitelyNotABot', 'HumanPerson1', 'RealHuman_ForReal', 'NotTheSEC', 'YourFavoriteShill', 'PaidPromoter', 'AnonAnalyst', 'ChartGuy',
  'TA_Tarot_Reader', 'AstrologyAlpha', 'MercuryRetrograde', 'CrystalBallCapital', 'VibesBasedInvesting', 'GutFeelingFund', 'CoinFlipCapital', 'DartboardDaniel', 'MonkeyWithDarts', 'HamsterPicksStocks',
  'LuckyPennyLou', 'SevenFigureSteve', 'SixFigureSally', 'FourFigureFrank', 'ThreeFigureTina', 'NegativeFigureNick', 'MinusTenK', 'DownBadDerek', 'UpGoodUma', 'BreakevenBen',
  'GoblinKing', 'GoblinQueen', 'HoardMaster', 'PupPackLeader', 'MoonPupMaxi', 'FireStarter_FIRE', 'FrogHatFanatic', 'HatFrogArmy', 'CrayonMuncher', 'BlockbustedBelieve',
  'MallWalkerMaxi', 'RocketWorksRiley', 'MegaByteMarcus', 'TitanTerry', 'NanaPhoneNancy', 'VelvetVince', 'SpoonGang', 'BoringBondBarbara', 'GrandmaIndexGina', 'WaterWorksWalt',
  'CornFarmerCarl', 'EtherealEthan', 'SolarFlareSophie', 'StableStan', 'PolkaDotPolly', 'CardboardKyle', 'RippleRick', 'SnowpileSam', 'LinkyMarine', 'HushHushHank',
  'BrainChainBrad', 'WombatWarrior', 'GasGuzzlerGary', 'NodeNerd', 'EuroPegEva', 'WoofingtonWhale', 'TPTPrepper', 'CopeCoinCody', 'BagsBagsBags', 'GrandmaCoinGran',
  'SquidGameSid', 'CatWithJobFan', 'ShibaBananaSplit', 'LostWalletHunter', 'UnobtainiumUma', 'QuantumBananaBoy', 'GhostChainGhoul', 'MarsDirtMike', 'AsteroidAndrea', 'LamboDAOvoter',
  'AirdropAddict', 'FaucetFarmer', 'StakingSteve', 'YieldFarmerYuri', 'LiquidityLucy', 'ImpermanentLoss', 'GasFeeVictim', 'WrongNetworkWes', 'SentToBurnAddress', 'SeedPhraseOnPostIt',
  'ForgotMyPassword', 'LostMyLedger', 'HardwareWalletHal', 'ColdStorageCole', 'HotWalletHolly', 'ExchangeHackedAgain', 'FundsAreSafu', 'WithdrawalPending', 'KYC_Kevin', 'VerifiedVera',
  'Crypto_Grandma', 'BoomerBuysBitcorn', 'GenZGambler', 'MillennialMoneyPit', 'GenXGains', 'SilentGenerationSells', 'BabyBoomBust', 'TeenTradingTitan', 'RetiredAndRekt',
  'DividendDave', 'IndexFundIngrid', 'BogleHeadBecky', 'PassiveIncomePaul', 'FIRE_movement_Fay', 'FrugalFred', 'CouponClipperCleo', 'SavingsAccountSid', 'PiggyBankPam', 'MattressMoney',
  'BullTrapBilly', 'BearTrapBrenda', 'WhipsawWill', 'SidewaysSally', 'ChopChopCharlie', 'RangeBoundRay', 'BreakoutBrittany', 'FakeoutFelix', 'PumpAndDumpDon', 'RugPullRoger',
  'ScamAlertSandra', 'RugInspector', 'AuditorAnon', 'WhitepaperReader', 'ActuallyReadTheDocs', 'TokenomicsTim', 'VestingScheduleVal', 'UnlockDayUlysses', 'SupplyShockSara', 'BurnRateBurt',
  'MemeLordMarcus', 'ShitcoinSheldon', 'MicrocapMaven', 'LowCapGem_Hunter', '100xOrNothing', '1000xLottery', 'MoonshotMolly', 'ToTheMoonTheo', 'MarsOrBust', 'PlutoPending',
  'HypeBeastHugo', 'InfluencerIvy', 'CourseSellerCody', 'SignalGroupSam', 'VIPAlphaChannel', 'TelegramPumpTeam', 'DiscordModDan', 'CommunityManagerKim', 'AmbassadorAmy', 'RaidLeaderRex',
  'Unc_Who_Trades', 'AuntiesPortfolio', 'CousinsCryptoTip', 'NeighborsNephew', 'BarberShopAlpha', 'UberDriverInsider', 'DentistDegen', 'NurseNightTrader', 'TeacherOnBreak', 'ChefWithCharts',
  'Plumber_Pumps', 'Electrician_Longs', 'FarmerFOMO', 'TruckerTendies', 'PilotPortfolio', 'LifeguardLeverage', 'LibrarianLongs', 'AccountantApe', 'LawyerLiquidated', 'DoctorDipBuyer',
  'NoSleepTilLambo', 'CaffeineCapital', 'EnergyDrinkEquity', 'RedBullRun', 'MonsterMargin', 'EspressoExposure', 'MatchaMoonshot', 'BobaBagholder', 'SushiSwapSue', 'PancakeStackPat',
  'xXx_Scalper_xXx', 'SwingTradeSwami', 'DayTradeDiva', 'PositionPete', 'HodlerSince2013', 'OG_Miner', 'GPU_Gary', 'AsicAndy', 'HashrateHannah', 'BlockRewardBrody',
  'StopLossSteve', 'TakeProfitTara', 'LimitOrderLenny', 'MarketOrderMaria', 'SlippageSlim', 'SpreadSpencer', 'OrderBookOscar', 'CandleCountess', 'VolumeVinnie', 'RSI_Rebecca',
  'MACD_Mack', 'BollingerBella', 'MovingAvgMo', 'GoldenCrossGrace', 'DeathCrossDex', 'SupportLevelSue', 'ResistanceRuss', 'TrendlineTrent', 'WedgeWatcher', 'TriangleTraderTy',
  'DoubleTopDot', 'DoubleBottomDug', 'GapFillGabe', 'WickHunterWes', 'LiquidityGrabLia', 'StopHuntStu', 'MarketMakerMel', 'SpoofingSpike', 'WashTradeWanda', 'FrontRunFrank',
  'MEV_Bot_9000', 'SandwichBotSandy', 'ArbBotArnold', 'GridBotGretchen', 'DCA_Daddy', 'DCA_Diane', 'LumpSumLuke', 'AllInAlice', 'HalfInHank', 'QuarterInQuinn',
  'CryptoCurious_Carol', 'ConfusedCraig', 'WhatIsABlockchain', 'ExplainLikeIm5', 'NewHereNora', 'FirstTimeFinn', 'BeginnersLuckBo', 'VeteranVal', 'ScarredSince2018', 'SurvivedThreeCycles',
  'BullishOnBananas', 'BearishOnBreakfast', 'NeutralNed', 'MaybeMaggie', 'IdkIdris', 'ProbablyPriya', 'DefinitelyDmitri', 'AbsolutelyAbe', 'NeverEverEve', 'AlwaysAlwaysAl',
  'Crypto_Cat_Lady', 'DogeDadVibes', 'FrogPfpFrank', 'ApePfpAmber', 'PunkPfpPaul', 'LaserEyesLola', 'CowboyHatChad', 'TopHatTim', 'MonocleMaxi', 'BowTieBears',
];
export const BOT_NAMES_A = ['Moon', 'Diamond', 'Paper', 'Degen', 'Crypto', 'Ape', 'Chart', 'Tendie', 'Whale', 'Shrimp', 'Frog', 'Goblin', 'Pup', 'Laser', 'Bag', 'Rug', 'Pump', 'Dip', 'Hodl', 'Stonk', 'Gm', 'Lambo', 'Rocket', 'Candle', 'Bull', 'Bear', 'Yolo', 'Fomo', 'Wagmi', 'Copium'];
export const BOT_NAMES_B = ['Boi', 'Hands', 'Lord', 'King', 'Queen', 'Maxi', 'Wizard', 'Goblin', 'Enjoyer', 'Andy', 'Becky', 'Chad', 'Karen', 'Steve', 'Larry', 'Hunter', 'Farmer', 'Sniper', 'Bandit', 'Monk', 'Prophet', 'Intern', 'Uncle', 'Gremlin', 'Pilot', 'Captain'];
export const BOT_EMOJI = ['🦍', '🐸', '🐶', '🐱', '🦊', '🐻', '🐂', '🐋', '🦐', '🤖', '👽', '🤡', '😎', '🥸', '🧠', '💎', '🚀', '🌙', '🔥', '💀', '🍕', '🧢', '🎩', '👑', '🐐', '🦄', '🐷', '🐼', '🐔', '🦖', '🥷', '🧙', '🤠', '👾', '🫠', '🍌'];

// Filler bots: short reactions that pad reply sections between the named accounts.
export const BOT_LINES = {
  reply: ['ratio', 'this', 'based', 'cope', 'real', 'facts', 'source?', 'nfa but yes', 'lmaooo', 'you\'re early', 'you\'re late', 'touch grass', 'I\'m in', 'I\'m out', 'agreed 100%', 'bro what', 'delete this', 'screenshot this', 'wen lambo', 'ngmi', 'wagmi', 'this will age badly', 'bullish', 'bearish', 'probably nothing', 'few understand', 'ser this is a casino', '🚀🚀🚀', '😭😭', '💀', '🤡', '🫡', '👀', '📉', '📈', 'my wife is going to leave me', 'mods?', 'followed', 'I was about to say this'],
  scam: ['Great post! I made $40,000 last week with these trading signals, DM me 💰', '🎉 Congratulations! You\'ve been selected for the {asset} airdrop, claim at totally-real-link dot com', 'Hi dear, I can help recover your lost crypto. DM 🙏', 'Want 100x? Join my VIP group 👉 link in bio', 'Send 1 {asset}, receive 2 {asset} back! Limited time! 🎁'],
};

// Said under an old post that aged badly (an endorsement before a crash), or well.
export const HINDSIGHT = {
  bad: ['this aged like milk 🥛', 'coming back to this post for the vibes', 'the receipts never lie', 'who\'s going to tell them', 'screenshot of this is going in the museum', 'I bought because of this post. I\'m fine. (I\'m not fine)', 'saving this for the documentary', 'did you sell before or after posting this'],
  good: ['ok fine this aged well', 'I hate that this was right', 'giving credit where it\'s due (reluctantly)', 'coming back to say: nice call', 'should\'ve listened. didn\'t. classic'],
};

// Trending tags market-wide events start.
export const EVENT_TAGS = {
  bull: '#BullRun', bear: '#BearMarket', mania: '#MemeMania', flash: '#FlashCrash', alt: '#AltSeason', earnings: '#EarningsWeek', snooze: '#Sideways',
  pump: '#ToTheMoon', crash: '#Rekt', rug: '#RugPull',
};
export const TRENDING_FILLER = ['#NotFinancialAdvice', '#WAGMI', '#BuyTheDip', '#gm', '#DiamondHands', '#Copium', '#TouchGrass', '#Chirper'];
