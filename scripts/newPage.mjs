import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import prettier from 'prettier';

const resolve = (__dirname, ...file) => path.resolve(__dirname, ...file);
const log = (message) => console.log(chalk.green(`${message}`));
const successLog = (message) => console.log(chalk.blue(`${message}`));
const errorLog = (error) => console.log(chalk.red(`${error}`));
log('请输入要生成的页面，格式为："页面目录:页面描述"， 创建在"/src/pages" 目录下');
log('示例：');
successLog('单级目录   a:页面a');
successLog('多级目录   a/b/c:页面abc');

let inputName, inputDesc;
process.stdin.on('data', async (chunk) => {
  // 获取输入的信息
  const content = String(chunk).trim().toString();
  const inputSearch = content.search(':');
  if (inputSearch == -1) {
    errorLog('格式错误，请重新输入');
    return;
  }
  // 拆分用户输入的名称和描述
  inputName = content.split(':')[0];
  inputDesc = content.split(':')[1] || inputName;
  log(`将在 /src/pages 目录下创建 ${inputName} 文件夹，并复制模板`);
  const targetPath = resolve('./src/pages', inputName);
  // 判断同名文件夹是否存在
  const pageExists = fs.existsSync(targetPath);
  if (pageExists) {
    errorLog('页面已经存在，请重新输入');
    return;
  }
  // 创建目录并复制文件
  fs.mkdirSync(targetPath, { recursive: true });
  successLog(`创建完成`);
  const sourcePath = resolve('./scripts/template');
  copyFile(sourcePath, targetPath);
  successLog(`模板复制完成`);
  // 获取pages.json文件内容，获取当前已有的页面集合
  await fs.readFile(path.resolve('./', 'pages.json'), 'utf-8', (err, data) => {
    if (err) throw err;
    // 判断是否为空文件
    if (data && data.trim().length > 0) {
      //获取老数据
      let jsonData = JSON.parse(data);
      //和老数据去重
      let index = jsonData.findIndex((ele) => {
        return ele.chunk == inputName;
      });
      if (index == -1) {
        //写入新页面的信息
        let obj = {
          chunk: inputName,
          chunkName: inputDesc
        };
        jsonData.push(obj);
        setPagesFile(jsonData);
      }
    } else {
      setPagesFile([
        {
          chunk: inputName,
          chunkName: inputDesc
        }
      ]);
    }
  });

  /**
   * 重写pages.json
   */
  async function setPagesFile(jsonData) {
    // 通过writeFile改变数据内容
    log(`正在重写pages.json文件`);
    prettier.resolveConfig(resolve('./', '.prettierrc.json'));
    const formatted = await prettier.format(JSON.stringify(jsonData), { parser: 'json' });
    fs.writeFile(path.resolve('./', 'pages.json'), formatted, 'utf-8', (err) => {
      if (err) throw err;
      successLog(`重写完成`);
      setHtmlFile();
    });
  }

  /**
   * 重写根目录下的index.html，方便本地调试
   */
  async function setHtmlFile(pageObj) {
    log(`正在重写根目录下的index.html文件`, pageObj);
    // 先获取html文件原内容
    await fs.readFile(path.resolve('./', 'index.html'), 'utf-8', async (err, data) => {
      if (err) throw err;
      // 找到"<body>"位置，向其后插入用于跳转的标签
      const bodyTagIndex = data.indexOf('<body>');
      if (bodyTagIndex === -1) {
        console.error('<body> 标签未找到');
        return;
      }
      // 在 <body> 后插入 <p> 标签
      const insertIndex = bodyTagIndex + '<body>'.length;
      const newContent = `${data.slice(0, insertIndex)}<p><a href="./src/pages/${inputName}/index.html">${inputDesc}</a></p>${data.slice(insertIndex)}`;
      // 将新得到的字符串格式化
      prettier.resolveConfig(resolve('./', '.prettierrc.json'));
      const formatted = await prettier.format(newContent, { parser: 'html' });
      fs.writeFile(path.resolve('./', 'index.html'), formatted, 'utf-8', (err) => {
        if (err) throw err;
        successLog(`重写完成`);
        process.stdin.emit('end');
      });
    });
  }
});

process.stdin.on('end', () => {
  successLog('创建新页面成功');
  process.exit();
});

// 判断文件夹是否存在，不存在创建一个
const isExist = (path) => {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
};

//递归复制模版文件夹内的文件
const copyFile = (sourcePath, targetPath) => {
  const sourceFile = fs.readdirSync(sourcePath, { withFileTypes: true });

  sourceFile.forEach((file) => {
    const newSourcePath = path.resolve(sourcePath, file.name);
    const newTargetPath = path.resolve(targetPath, file.name);
    //isDirectory() 判断这个文件是否是文件夹，是就继续递归复制其内容
    if (file.isDirectory()) {
      isExist(newTargetPath);
      copyFile(newSourcePath, newTargetPath);
    } else {
      fs.copyFileSync(newSourcePath, newTargetPath);
    }
  });
};
