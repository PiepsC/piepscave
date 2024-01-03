<?php
        $result = array();
        $files = glob('*', GLOB_ONLYDIR);

        foreach($files as $file){
                if($file == '.' || $file == '..') continue;
                array_push($result, "\"$file\"");
        }
        $str = implode(',', $result);
        echo "[$str]";
?>