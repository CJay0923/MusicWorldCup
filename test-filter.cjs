const data = require('./src/data/singerData/stefanie.json');
console.log('总歌曲数:', data.entrants.length);
console.log('preprocessed:', data.preprocessed);

const MIN_FAV = 50000;
let filtered = 0;
let noCover = 0;
let lowFav = 0;
let passed = 0;

data.entrants.forEach((song, i) => {
  const hasCover = !!(song.albumMid || song.pic);
  const fav = song.favCount || 0;

  if (!hasCover) {
    noCover++;
    if (noCover <= 5) console.log('无封面:', song.name, '| albumMid:', albumMid, '| pic:', song.pic);
  } else if (fav < MIN_FAV) {
    lowFav++;
    if (lowFav <= 5) console.log('低收藏量:', song.name, '| favCount:', fav);
  } else {
    passed++;
    if (passed <= 5) console.log('✅ 通过:', song.name, '| favCount:', fav);
  }
});

console.log('\n=== 过滤统计 ===');
console.log('✅ 通过过滤:', passed);
console.log('❌ 无封面:', noCover);
console.log('⚠️ 低收藏量 (<5万):', lowFav);
console.log('📊 总计应保留:', passed);
