<?php
/**
 * Plugin DokuCrypt2: Enables client side encryption
 *
 * @license    GPL 2 (http://www.gnu.org/licenses/gpl.html)
 * @author     Scott Moser <smoser@brickies.net>, Maintainer Sherri W. ( contact me at syntaxseed.com)
 */

// must be run within Dokuwiki
if (!defined('DOKU_INC')) {
    die();
}

if (!defined('DOKU_PLUGIN')) {
    define('DOKU_PLUGIN', DOKU_INC.'lib/plugins/');
}
require_once(DOKU_PLUGIN.'syntax.php');

/**
 * All DokuWiki plugins to extend the parser/rendering mechanism
 * need to inherit from this class
 */
class syntax_plugin_dokucrypt2 extends DokuWiki_Syntax_Plugin
{
    public $curNum=0;
    public $curLock=0;
    /**
     * return some info
     */
    public function getInfo()
    {
        return array(
            'author' => 'Scott Moser, Maintainer Sherri Wheeler',
            'email'  => 'Twitter @SyntaxSeed or http://SyntaxSeed.com',
            'date'   => '2024-05-01',
            'name'   => 'Client Side Encryption Plugin',
            'desc'   => 'Client side cryptography enabling encrypting blocks of text within a wiki page.',
            'url'    => 'https://www.dokuwiki.org/plugin:dokucrypt2',
        );
    }

    public function getType()
    {
        return 'protected';
    }
    public function getAllowedTypes()
    {
        return array();
    }
    public function getSort()
    {
        return 999;
    }
    public function connectTo($mode)
    {
        $this->Lexer->addEntryPattern(
            '<ENCRYPTED.*?>(?=.*?</ENCRYPTED>)',
            $mode,
            'plugin_dokucrypt2'
        );
    }
    public function postConnect()
    {
        $this->Lexer->addExitPattern('</ENCRYPTED>', 'plugin_dokucrypt2');
    }

    /**
     * Handle the match
     */
    public function handle($match, $state, $pos, Doku_Handler $handler)
    {
        switch ($state) {
          case DOKU_LEXER_ENTER:
                // parse something like <ENCRYPTED> or <ENCRYPTED LOCK=foo>
                $attr=array( "lock" => "default", "collapsed" => "1" );
                if (($x=strpos($match, "LOCK="))!==false) {
                    $x+=strlen("LOCK=");
                    if (($end=strpos($match, " ", $x))!==false) {
                        $len=$end-$x;
                    } else {
                        $len=-1;
                    }
                    $attr["lock"]=substr($match, $x, $len);
                }
                if (($x=strpos($match, "COLLAPSED="))!==false) {
                    $x+=strlen("COLLAPSED=");
                    if (($end=strpos($match, " ", $x))!==false) {
                        $len=$end-$x;
                    } else {
                        $len=-1;
                    }
                    $attr["collapsed"]=substr($match, $x, $len);
                }
                return(array($state,$attr));
          case DOKU_LEXER_UNMATCHED:  return array($state, $match);
          case DOKU_LEXER_EXIT:       return array($state, '');
        }
        return array();
    }

    /**
     * Create output
     */
    public function render($mode, Doku_Renderer $renderer, $data)
    {
        if ($mode == 'xhtml') {
            list($state, $match) = $data;
            switch ($state) {
              case DOKU_LEXER_ENTER:
                $this->curLock=$match;
                break;
              case DOKU_LEXER_UNMATCHED:
                $curid = "crypto_decrypted_" . $this->curNum;

                $renderer->doc.="<a id='$curid" . "_atag' " .
                  "class='wikilink1 dokucrypt2dec JSnocheck' " .
                  "href=\"javascript:toggleCryptDiv(" .
                  "'$curid','" . $this->curLock["lock"] . "','" .
                  htmlspecialchars(str_replace("\n", "\\n", $match)) . "');\">" .
                  "Decrypt Encrypted Text</a>" .
                  "&nbsp;&nbsp;[<a class='wikilink1 dokucrypt2toggle JSnocheck' " .
                  "href=\"javascript:toggleElemVisibility('$curid');\">" .
                  "Toggle Visible</a>]\n" .
                  "<PRE id='$curid' class='dokucrypt2pre' style=\"" .
                     (($this->curLock["collapsed"] == 1) ?
                        "visibility:hidden;position:absolute;white-space:pre-wrap;word-wrap: break-word;" :
                        "visibility:visible;position:relative;white-space:pre-wrap;word-wrap: break-word;") .
                  "\">". htmlspecialchars($match)."</PRE>";
                $this->curNum++;
                break;
              case DOKU_LEXER_EXIT:
                break;
            }
            return true;
        }
        return false;
    }
}
