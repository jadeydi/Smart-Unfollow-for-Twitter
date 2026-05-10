// 向下滚动扫描账号 (用于从顶部开始模式)
const scrollDownToScan = async () => {
  let previousScrollY = window.scrollY;
  let scrollAttempts = 0;
  let reachedBottom = false;
  let unchangedCount = 0;
  const maxUnchanged = 5; // 增加重试次数，应对网络波动
  let lastHeight = document.body.scrollHeight;

  // 用于追踪页面内容变化
  let previousVisibleAccounts = new Set();
  let sameContentCount = 0;
  const maxSameContent = 15; // 增加内容未变化时的允许次数，应对虚拟列表加载慢的情况

  console.log(`开始从顶部向下滚动搜索账号... 目标: ${targetNonKeptCount}个未标记保留账号`);

  while (nonKeptCount < targetNonKeptCount && !shouldStop && !reachedBottom && sameContentCount < maxSameContent) {
    // 向下滚动一屏高度
    window.scrollBy(0, window.innerHeight * 0.8);
    await delay(2000); // 增加等待时间，确保内容加载

    if (shouldStop) break;

    scrollAttempts++;

    // 检查高度和滚动位置变化
    const currentHeight = document.body.scrollHeight;
    const currentScrollY = window.scrollY;

    console.log(`滚动 #${scrollAttempts}: 位置 ${currentScrollY}px, 总高度 ${currentHeight}px, 已找 ${nonKeptCount}/${targetNonKeptCount}`);

    // 检查是否真的滚动了
    if (Math.abs(currentScrollY - previousScrollY) < 50) {
      unchangedCount++;
      console.log(`滚动位置未显著变化 (${unchangedCount}/${maxUnchanged})`);

      if (unchangedCount >= maxUnchanged) {
        console.log('连续多次滚动位置未变化，可能已到达页面底部');
        reachedBottom = true;
        // 在确认到底之前，再尝试最后一次强力滚动
        window.scrollTo(0, document.body.scrollHeight);
        await delay(2000);
        if (document.body.scrollHeight === currentHeight) break;
        else {
          unchangedCount = 0;
          reachedBottom = false;
        }
      }
    } else {
      unchangedCount = 0;
      previousScrollY = currentScrollY;
    }

    lastHeight = currentHeight;

    // 提取当前可见的账号信息
    const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
    let newAccountsFound = 0;
    let newNonKeptFound = 0;
    const currentVisibleAccounts = new Set();

    for (const cell of cells) {
      const accountInfo = extractAccountInfo(cell, keepList);
      if (!accountInfo) continue;

      currentVisibleAccounts.add(accountInfo.username);

      if (!followingList.some(a => a.username === accountInfo.username)) {
        followingList.push(accountInfo);
        newAccountsFound++;

        if (!keepList.has(accountInfo.username)) {
          nonKeptCount++;
          newNonKeptFound++;
        }

        if (nonKeptCount % 5 === 0) { // 更频繁地更新进度
          sendPreviewProgress();
        }

        if (nonKeptCount >= targetNonKeptCount) {
          break;
        }
      }
    }

    console.log(`本轮找到 ${newAccountsFound} 个新账号 (${newNonKeptFound} 个未标记保留), 当前总计: ${nonKeptCount}/${targetNonKeptCount}`);

    // 内容重复性检查
    if (currentVisibleAccounts.size > 0) {
      let sameContent = true;
      if (currentVisibleAccounts.size !== previousVisibleAccounts.size) {
        sameContent = false;
      } else {
        for (const username of currentVisibleAccounts) {
          if (!previousVisibleAccounts.has(username)) {
            sameContent = false;
            break;
          }
        }
      }

      if (sameContent) {
        sameContentCount++;
        console.log(`内容未变化 (${sameContentCount}/${maxSameContent})`);
      } else {
        sameContentCount = 0;
        previousVisibleAccounts = new Set(currentVisibleAccounts);
      }
    } else {
      // 如果没找到任何单元格，可能是加载中
      sameContentCount++;
      console.log(`未找到单元格，等待加载... (${sameContentCount}/${maxSameContent})`);
    }

    sendPreviewProgress();
  }

  console.log(`向下滚动扫描结束。总计扫描 ${scrollAttempts} 次，找到 ${nonKeptCount} 个待取关账号。`);
};
