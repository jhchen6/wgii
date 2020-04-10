/* eslint-disable global-require,import/no-dynamic-require */
/**
 * 根据多国家、多坐标体系的边界坐标点抽稀
 */


const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const douglasPeucker = require('../src/common/map/douglas-peucker');
const logger = require('../src/common/logger');

const MaxHeight = [1, 2, 5, 10, 20];

/**
 * 获取文件列表
 */
async function geoJsonFiles() {
  const filePaths = [];
  const dirsPath = path.join(__dirname, '../dist');
  const dirs = fs.readdirSync(dirsPath);
  _.each(dirs, (dirName) => {
    const dirPath = path.join(dirsPath, `/${dirName}`);
    const dir = fs.statSync(dirPath);
    if (dir.isDirectory()) {
      const files = fs.readdirSync(dirPath);
      _.each(files, (fileName) => {
        // 根据文件名称过滤
        if (/country\.[a-zA-z0-9]*\.geo\.json/g.test(fileName)) {
          filePaths.push(path.join(dirPath, `/${fileName}`));
        }
      });
    }
  });
  return filePaths;
}

/**
 * 读取文件内容
 * @param {*} filePath 文件路径
 */
const sparse = (filePath) => {
  let json;
  try {
    json = require(filePath);
  } catch (error) {
    logger.error(filePath, 'failed');
    return;
  }
  _.each(MaxHeight, (maxHeight) => {
    const resultFilePath = filePath.replace(/\.geo\.json/g, `.sparse.${maxHeight}.geo.json`);
    let resultCoorinates = [];

    function handleBlock(block) {
      const pointsArray = block[0];
      if (pointsArray.length > 100) {
        const result = douglasPeucker(pointsArray, maxHeight);
        return [result];
      }
      return block;
    }

    let geometry;
    if (json.type === 'FeatureCollection') {
      // eslint-disable-next-line prefer-destructuring
      geometry = json.features[0].geometry;
    } else if (json.type === 'Feature') {
      // eslint-disable-next-line prefer-destructuring
      geometry = json.geometry;
    } else {
      logger.log('other json type');
      return;
    }
    if (geometry.type === 'MultiPolygon') {
      resultCoorinates = geometry.coordinates.map(handleBlock);
    } else if (geometry.type === 'Polygon') {
      resultCoorinates = handleBlock(geometry.coordinates);
    } else {
      logger.log('other geometry type');
      return;
    }

    geometry.coordinates = resultCoorinates;
    fs.writeFileSync(resultFilePath, JSON.stringify(json));
  });
  logger.info(`    √ 抽稀 - ${filePath} - 完成`);
};

async function runSparse() {
  const filePaths = await geoJsonFiles();
  filePaths.map(sparse);
  logger.info('  √ 运行 - 抽稀 - 完成');
}

module.exports = {
  runSparse,
};
