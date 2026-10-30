/**
 * dsh-bili-upload-kit · B站投稿工具箱（Host插件·零依赖）
 * 网页投稿SOP：登录态治理（持久档案）→浏览器自动化上传→表单→创作声明→投稿。
 * ⚠️合规：只投自己原创或授权内容·如实勾选创作声明（AI内容明牌）·遵守平台规则不刷量。
 * 工具: bili_upload_kit(环境体检+持久档案登录SOP+playwright投稿脚本骨架)。
 */
export const name = 'bili-upload-kit'
export const inject = ['systemPrompt', 'tools']
const SECTION = 'bili-upload-kit:rules'
const DEFAULTS = { order: 99, enabled: true, tool: true, profileDir: 'bili_profile' }

function norm(c) { const r = c ?? {}; return { order: typeof r.order === 'number' ? r.order : DEFAULTS.order, enabled: r.enabled !== false, tool: r.tool !== false, profileDir: typeof r.profileDir === 'string' ? r.profileDir : DEFAULTS.profileDir } }

function renderSection() {
  return [
    '## B站投稿 · SOP纪律',
    '',
    '**登录态**：playwright持久档案(user_data_dir)登录——设备指纹固定·风控当熟客·cookie数周有效·人脸只扫一次。裸cookie投稿接口会被风控412。',
    '**投稿流**：①member.bilibili.com投稿页→②input[type=file]挂视频（accept含.mp4的input）→③等"上传完成"字样→④填标题(≤80字)/简介(contenteditable)/标签(逐个回车)→⑤**创作声明必选**（如实·AI内容明牌选"含AI生成内容"）→⑥「立即投稿」。',
    '**风控三不**：不短时间连投（间隔≥10分钟）·不标题党马甲（判低质）·不动别人账号。',
    '**声明诚实**：AI配音/AI形象=选"含AI生成内容"——明牌不是义务是信任资产。',
  ].join('\n')
}

export default function plugin(ctx) {
  const cfg = norm(ctx.config?.[SECTION])
  if (!cfg.enabled) { ctx.logger?.info?.('dsh-bili-upload-kit: disabled'); return }
  ctx.registerSection?.({ name: SECTION, order: cfg.order, render: () => renderSection() })
  if (!cfg.tool) return
  ctx.registerTool?.({
    name: 'bili_upload_kit',
    description: 'B站投稿工具箱：环境体检（playwright/chromium）+持久档案登录SOP+playwright网页投稿脚本骨架（含创作声明处理）。',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: { schema: { type: 'object', properties: { report: { type: 'string' } }, required: ['report'], additionalProperties: false } },
    execute: async () => {
      try {
        const { execFile } = await import('node:child_process')
        const pw = await new Promise(res => execFile('python3', ['-c', 'import playwright'], { timeout: 8000 }, e => res(!e)))
        const pd = cfg.profileDir
        return { report: [
          '【B站投稿工具箱】',
          `  playwright: ${pw ? '✓' : '✗（pip install playwright && playwright install chromium）'}`,
          '',
          '【① 持久档案登录（一次性·扫脸后cookie数周）】',
          `python3 -c "from playwright.sync_api import sync_playwright`,
          `with sync_playwright() as p:`,
          `    b=p.chromium.launch_persistent_context('${pd}',headless=False)`,
          `    pg=b.pages[0];pg.goto('https://www.bilibili.com')`,
          `    input('登录完成后回车');b.close()"`,
          '',
          '【② 网页投稿脚本骨架（playwright·含创作声明）】',
          '  1 launch_persistent_context + 注入cookies（若需）',
          '  2 goto member.bilibili.com/platform/upload/video/frame',
          '  3 input[type=file][accept*=video].set_input_files(视频)',
          `  4 wait_for_selector('text=上传完成', 90000)`,
          '  5 fill标题 + 点简介contenteditable打字 + 标签逐个回车',
          '  6 创作声明: 点下拉→点「含AI生成内容」（JS遍历textContent直选最稳）',
          '  7 get_by_text(立即投稿).click() → 截图存证',
          '',
          '【风控三不】不连投（间隔≥10分钟）·不标题党·不动别人账号。',
          '【声明诚实】AI配音/AI形象=明牌选「含AI生成内容」。',
        ].join('\n') }
      } catch (error) {
        return { report: 'bili-upload-kit 内部错：' + String(error?.message ?? error).slice(0, 160) }
      }
    },
  })
  ctx.logger?.info?.('dsh-bili-upload-kit: registered (order=%d)', cfg.order)
}
