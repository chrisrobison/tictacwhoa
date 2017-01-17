<?php
   $link = mysql_connect('localhost', 'mail', 'activate') or die('Could not connect: ' . mysql_error());
   mysql_select_db('tictacwhoa') or die('Could not select database');
  
   $json = file_get_contents('php://input'); 
   $in = cleanInput(json_decode($json));

   switch ($in->action) {
      case "login":
         $result = mysql_query("select * from player where fb_id='".$in->data->fb_id."'");
         $out = mysql_fetch_assoc($result);
         if (!$out) {
            $fields = array('id', 'player', 'email', 'fb_id', 'photo', 'created');
            $sql = makeInsert("player", $fields, $in->data);
            doLog("[LOGIN] $sql");

            // Create new record
            mysql_query($sql);   
            
            // Then fetch the newly created record to return to client
            $out = getRecord('player', $in->data->fb_id, 'fb_id');
            $out["registered"] = true;
         }
         if ($out['id']) {
            setcookie("id", $out['id']);
         }
         break;
      case "getPlayer":
         $out = getRecord('player', $in->data->id);
         
         break;
      case "getGame":
         $out = getRecord('game', $in->data->id);

         break;
      case "getMoves":
         $result = mysql_query("select * from move where for_player_id='".$in->data->for_player_id."' and game_id='".$in->data->game_id."' and seen!=1");
         $out = new stdClass();
         $moves = array();

         while ($move = mysql_fetch_assoc($result)) {
            $moves[] = $move;
         }
         $out->moves = $moves;
         break;
       case "getGames":
         doLog("[getGames] id: ".$in->data->id);
         $sql = "select * from game where player1_id='".$in->data->id."' or player2_id='".$in->data->id."'";
         doLog("[getGames] $sql");

         $result = mysql_query($sql);
         $out = new stdClass();
         $games = array();
         $players = array();

         while ($game = mysql_fetch_assoc($result)) {
            $games[] = $game;
            if ($game['player1_id'] == $in->data->id) {
               if (!$players[$game['player2_id']]) {
                  $players[$game['player2_id']] = getRecord('player', $game['player2_id']);
               }
            } else if ($game['player2_id'] == $in->data->id) {
               if (!$players[$game['player1_id']]) {
                  $players[$game['player1_id']] = getRecord('player', $game['player1_id']);
               }
            }
         }
         
         $out->players = $players;
         $out->games = $games;
         
         break;
       case "getPlayers":
         $result = mysql_query("select * from player");
         $out = new stdClass();
         $players = array();

         while ($player = mysql_fetch_assoc($result)) {
            $players[] = $player;
         }
         $out->players = $players;
         break;
       case "saveGame":
         $upd = "update game set ";
         $arr = array();

         foreach ($in->data as $key=>$val) {
            $arr[] = $key."='".$val."'";   
         }
         $upd .= implode($arr, ", ");
         doLog("[saveGame] ".$upd);
         mysql_query($upd);
         $out = getRecord('game', $in->data->id);

         break;
       case "invites":
         $result = mysql_query("select * from invite where player2_id='".$in->data->id."'");
         $invites = array();
         $requests = array();
         $players = array();
         while ($invite = mysql_fetch_assoc($result)) {
            if (!$players[$invite['player1_id']]) {
               $player = getRecord('player', $invite['player1_id']);
               $players[$invite['player1_id']] = $player;
            }
            $invite["player"] = $players[$invite['player1_id']]["player"];
            $invite["photo"] = $players[$invite['player1_id']]["photo"];
            $invites[] = $invite;
         }
         $result = mysql_query("select * from invite where player1_id='".$in->data->id."'");
         while ($request = mysql_fetch_assoc($result)) {
            if (!$players[$request['player2_id']]) {
               $player = getRecord('player', $request['player2_id']);
               $players[$request['player2_id']] = $player;
            }
            $request["player"] = $players[$request['player2_id']]["player"];
            $request["photo"] = $players[$request['player2_id']]["photo"];
            $requests[] = $request;
         }
          
         $out = new stdClass();
         $out->invites = $invites;
         $out->players = $players;
         $out->requests = $requests;

         break;
      
      case "invite":
         $fields = array('player1_id', 'player2_id', 'created');
         $sql = makeInsert("invite", $fields, $in->data);
         doLog($sql);
         mysql_query($sql);
         $id = mysql_insert_id();
         $out = getRecord('invite', $id);

         break;
      case "cancelInvite":
         if ($in->data->id) {
            $invite = getRecord('invite', $in->data->id);
            $player = getRecord('player', $invite['player2_id']);

            $sql = "delete from invite where id='".$in->data->id."'";
            doLog("[cancelInvite] Canceling invite to ".$player['player']." [invite id {$in->data->id}]");
            doLog("[cancelInvite] $sql");
            mysql_query($sql);
            $out = new stdClass();
            $out->action = "notify";
            $out->data = new stdClass();
            $out->data->msg = "Canceled invitation to {$player['player']} [invite id {$in->data->id}]";
         }
         break;
      case "start":
         $data = $in->data;
         
         if ($data->id) {
            $invite = getRecord('invite', $data->id);
            mysql_query("delete from invite where id='{$data->id}'");
            $data->player1_id = $invite['player1_id'];
            $data->player2_id = $invite['player2_id'];

            $fields = array('player1_id', 'player2_id', 'game', 'created');
            $sql = makeInsert("game", $fields, $data);
            doLog("[START] $sql");
            mysql_query($sql);
            $id = mysql_insert_id();
            $out = getRecord('game', $id);
         } 

         break;
      case "ackMove":
         $sql = "update move set seen=1 where id={$in->data->id}";
         doLog("[ackMove] $sql");
         mysql_query($sql);
         $out = new stdClass();
         $out->action = "notify";
         $out->data = new stdClass();
         $out->data->msg = "Move ID {$in->data->id} acknowledged";

         break;
      case "move":
         $fields = array('player', 'player_id', 'for_player_id', 'game_id', 'move', 'mark', 'created');
         if (!$in->data->mark) {
            $in->data->mark = ($in->data->player==1) ? "O" : "X";
         }

         $sql = makeInsert("move", $fields, $in->data);
         doLog("[MOVE] $sql");
         mysql_query($sql);
         
         $id = mysql_insert_id();
         $out = getRecord('move', $id);
         
         // Store game state and set current player
         $sql = "update game set game='".$in->data->game."', player_up='".($in->data->player^1)."', last_move='".$in->data->move."' where id='".$in->data->game_id."'";
         doLog("[MOVE] Updated game: $sql");
         mysql_query($sql);
         

         break;

      case "update":
         if (($in->table) && ($in->data->id)) {
            $sql = "update ".$in->table." set ";
            
            $fields = array();
            foreach ($in->data as $key=>$val) {
               if ($key != "id") {
                  $fields[] = $key."='".$val."'";
               }
            }
            
            $sql .= implode($fields, ", ");
            $sql .= " where id='".$in->data->id."'";

            mysql_query($sql);
            $result = mysql_query("select * from ".$in->table." where id='".$in->data->id."'");
            $out = mysql_fetch_assoc($result);

            doLog("[UPDATE] $sql");
         }
         break;

   }
   
   function makeInsert($table, $fields, $data) {
      $out = "INSERT INTO $table (" . implode($fields, ", ") .") VALUES ";
      $vals = array();

      foreach ($fields as $field) {
         if ($field == "created") {
            $vals[] = "now()";
         } else {
            $vals[] = "'".$data->$field."'";
         }
      }

      $out .= "(" . implode($vals, ", ") . ")";

      return $out;
   }

   function cleanInput($in) {
      switch (gettype($in)) {
         case "object":
            $new = new stdClass();
            break;
         case "array":
            $new = array();
            break;
      }

      foreach ($in as $key=>$val) {
         if (is_object($val)) {
            $new->$key = cleanInput($val);
         } else if (is_array($val)) {
            $new[$key] = cleanInput($val);
         }
         if (is_scalar($val)) {
            if (is_object($new)) {
               $new->$key = mysql_real_escape_string($val);
            } else if (is_array($new)) {
               $new[] = mysql_real_escape_string($val);
            }
         } 
      }
      return $new;
   }
   
   function getRecord($tbl, $id, $field="id") {
      $sql = "select * from $tbl where $field='$id'";
      doLog("[getRecord] $sql");
      $dbh = mysql_query($sql);
      $out = mysql_fetch_assoc($dbh);

      return $out;
   }

   function getRecords($tbl, $id, $field="id", $extra="") {
      $sql = "select * from $tbl where $field='$id' $extra";
      doLog("[getRecord] $sql");
      $dbh = mysql_query($sql);
      $out = new stdClass();
      $items = array();

      while ($item = mysql_fetch_assoc($dbh)) {
         $items[] = $item;   
      }
      $out->$tbl = $items;

      return $out;
   }

 
   function doLog($what) {
      file_put_contents("/tmp/ttw.log", $what."\n", FILE_APPEND | LOCK_EX);
   }

   header("Content-type: application/json");
   print json_encode($out);
?>
