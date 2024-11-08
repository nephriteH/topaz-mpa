const { exec } = require('child_process');
const pagesArray = require('../pages.json');

// 获取命令行参数
const args = process.argv;
// 配置环境 比如npm run build-all:test npm run build-all:development  暂时没启用，待优化
const commandLineArgs = args.slice(2);

for (let i = 0; i < pagesArray.length; i++) {
  const page = pagesArray[i];
  // 定义要执行的命令
  const commandToExecute = `npm run build${commandLineArgs[0] === 'test' ? ':test' : ''} --page=${page.chunk}`;
  exec(
    commandToExecute,

    (error, stdout, stderr) => {
      if (error) {
        console.error(`打包出错: ${error.message}`);
        return;
      }

      console.log(`打包成功(${commandToExecute}):\n${stdout}`);
    }
  );
}
