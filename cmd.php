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
         break;
      case "getPlayer":
         $out = getRecord('player', $in->data->id);
         
         break;
      case "getMoves":
         $result = mysql_query("select * from move where for_player_id='".$in->data->for_player_id."' and game_id='".$in->data->game_id."'");
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
       case "invites":
         $result = mysql_query("select * from invite where player2_id='".$in->data->id."'");
         $invites = array();
         $players = array();
         while ($invite = mysql_fetch_assoc($result)) {
            $player = getRecord('player', $invite['player1_id']);
            $players[$invite['player1_id']] = $player;
            $invite["player"] = $player["player"];
            $invite["photo"] = $player["photo"];
            $invites[] = $invite;
         }
         $out = new stdClass();
         $out->invites = $invites;
         $out->players = $players;

         break;
      
      case "invite":
         $fields = array('id', 'player1_id', 'player2_id', 'sent', 'accepted', 'created', 'last_modified');
         $sql = makeInsert("invite", $fields, $in->data);
         doLog($sql);
         mysql_query($sql);

         break;

      case "start":
         $data = $in->data;
         $fields = array('player1_id', 'player2_id', 'created');
         $sql = makeInsert("game", $fields, $data);
         doLog("[START] $sql");
         mysql_query($sql);
         $id = mysql_insert_id();
         $out = getRecord('game', $id);

         break;

      case "move":
         $fields = array('player', 'player_id', 'for_player_id', 'game_id', 'move', 'created');
         $sql = makeInsert("move", $fields, $in->data);
         doLog("[MOVE] $sql");
         mysql_query($sql);
         $id = mysql_insert_id();
         $out = getRecord('move', $id);
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
