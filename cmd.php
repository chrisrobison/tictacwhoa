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
            mysql_query($sql);
            
            $fetch = mysql_query("select * from player where fb_id='".$in->data->fb_id."'");
            $out = mysql_fetch_assoc($fetch);
            $out["registered"] = true;
         }
         break;

      case "invites":
         $result = mysql_query("select * from invite where player2_id='".$in->data->id."'");
         $invites = array();
         while ($invite = mysql_fetch_assoc($result)) {
            $invites[] = $invite;
         }
         $out = new stdClass();
         $out->invites = $invites;
         
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

         break;

      case "move":
         $fields = array('player', 'move', 'created');
         $sql = makeInsert("move", $fields, $in->data);
         doLog("[MOVE] $sql");
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

   function doLog($what) {
      file_put_contents("/tmp/ttw.log", $what."\n", FILE_APPEND | LOCK_EX);
   }

   header("Content-type: application/json");
   print json_encode($out);
?>
