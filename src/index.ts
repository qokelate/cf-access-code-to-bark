import PostalMime from "postal-mime";

const TARGET_SENDER = "noreply@notify.cloudflare.com";

export default {
    async email(message, env, ctx) {
        await message.forward("inbox@corp");

        // 1. 只处理来自 Cloudflare Access 的邮件
        if (message.from.toLowerCase() !== TARGET_SENDER) {
            // 非目标邮件：直接放行/转发，或忽略。这里选择忽略。
            return;
        }

        // 2. 解析邮件正文
        const parser = new PostalMime.default();
        const email = await parser.parse(await new Response(message.raw).arrayBuffer());
        const body = email.text || email.html || "";

        // 3. 提取 Cloudflare Access 的一次性 PIN
        //    Cloudflare 的 OTP 通常是 6 位数字。
        //    这里使用正则匹配独立的 6 位数字，避免误抓其他数字。
        const match = body.match(/\b\d{6}\b/);


        // 4. 推送到 Bark
        const barkKey = env.BARK_KEY;
        const barkServer = env.BARK_SERVER || "https://api.day.app";
        const pushUrl = `${barkServer}/${barkKey}`;

        if (!barkKey) {
            console.error("未配置 BARK_KEY 环境变量");
            return;
        }

        if (!match) {
            console.warn("未在邮件正文中找到 6 位数字验证码，跳过推送。Subject:", email.subject);
            await fetch(`${pushUrl}/未找到验证码`);
            return;
        }

        const code = match[0];
        await fetch(`${pushUrl}/${code}`);
    },
};
