# DokuWiki Plugin: DokuCrypt2

<div align="center">
    <a href="https://phpc.social/@syntaxseed">
        <img src="https://img.shields.io/mastodon/follow/11361?domain=https%3A%2F%2Fphpc.social"
            alt="follow on Mastodon"></a>&nbsp;&nbsp;<a href="https://github.com/syntaxseed#donatecontribute"><img src="https://img.shields.io/badge/Sponsor-Project-blue" alt="Sponsor Project" /></a>
</div>

This is a plugin for DokuWiki to support client side cryptography.

* https://www.dokuwiki.org/plugin:dokucrypt2
* Licence: GPL-2.0 (https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html)
* Author: Originally by By Scott Moser. Maintained by Sherri Wheeler. (Twitter @SyntaxSeed. https://syntaxseed.com)

> **!! Warning:** This plugin should not replace a password manager or peer reviewed cryptography tools for high-priority use. Do not store mission critical type data with this plugin - I cannot be sure that the info is not cached by DokuWiki or the web browser.

> **!! This plugin is provided without warranty or guarantee of any kind. Use at your own discretion.**

## Usage

```
Hi world.  I have a secret.  Can you read it?
<SECRET>I like ice cream</SECRET>
```

When the user hits 'Save' (or a draft is attempted to be saved) a prompt will open, asking the user to enter a pass phrase key for the encryption. Once supplied, the encryption will be done in the browser and the encrypted text submitted to the server.

## Settings

This plugin includes configuration settings.

* `copytoclipboard` - If set to true, the plugin tries to copy the decrypted value to the clipboard.
* `hidepasswordoncopytoclipboard` - If set to true, the decrypted value will not be shown after being copied to the clipboard (see option 'copytoclipboard').

## ChangeLog

* 2022-08-08: Added ability and setting for copying the contents to the clipboard on decrypt.
  * Contributed by Thomas Schäfer (https://github.com/ternite).
* 2022-02-02: Preparatory fixes/testing for PHP 8. Improvements for code style PSRs.
* 2021-05-18: Fix for internal link edit toolbar button. Issue #12.
* 2021-03-03: Add wrapping for the pre tag. Contributed by dustin-something.
* 2020-10-19: Formatting changes, add CSS classes, collapse by default.
* 2020-10-14: Temp fix for Dokuwiki 2020-07-29 "Hogfather". DecryptSecret button was not appearing on page edit.
* 2020-02-07: Updated for PHP v 7+.
* 2017-11-08: Fixed an issue with the heading buttons 'PATCH 1' required (above). Added plugin info text file.
* 2017-06-25: Fork the original plugin. Patch it up. Release for most recent DokuWiki version. Cheers!
