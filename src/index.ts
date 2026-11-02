import PostalMime from "postal-mime";

export default {
    async email(message, env, ctx) {

        const rawdata = await new Response(message.raw).arrayBuffer();

        if (env.FORWARDTO) {
            await message.forward(env.FORWARDTO);
        }

        const barkKey = env.BARK_KEY || '';
        const barkServer = env.BARK_SERVER || "https://api.day.app";
        const pushUrl = `${barkServer}/${barkKey}`;

        // 0. 检查Bark环境
        if (!barkKey) {
            console.error("未配置 BARK_KEY 环境变量");
            return;
        }

        // const TARGET_SENDER = "noreply@notify.cloudflare.com";
        // 1. 只处理来自 Cloudflare Access 的邮件
        // if (message.from.toLowerCase() !== TARGET_SENDER) {
        //     // 非目标邮件：直接放行/转发，或忽略。这里选择忽略。
        //     await fetch(`${pushUrl}/${message.from.toLowerCase()}`);
        //     return;
        // }

        // 2. 解析邮件正文
        const email = await PostalMime.parse(rawdata);
        const body = email.text || email.html || "";


        // 3. 提取 Cloudflare Access 的一次性 PIN
        //    Cloudflare 的 OTP 通常是 6 位数字。
        //    这里使用正则匹配独立的 6 位数字，避免误抓其他数字。
        const match = body.match(/\b\d{6}\b/);
        if (!match) {
            console.warn("未在邮件正文中找到 6 位数字验证码，跳过推送。Subject:", email.subject);
            await fetch(`${pushUrl}/CodeNotFound`);
            return;
        }

        const code = match[0];
        await fetch(`${pushUrl}/${code}`);
    },
};
