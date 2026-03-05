# project plan
to build backend api for my router automation
- i have 2 types of data in my db 
- routers, switches, users
- routers will have make, model, ssid[2.4GHz,5GHz,6GHz fetched dynamically], security_types, admin_page_url, inedx
- sitches will have mac_address, inedx, url [basically the endpoint used to send http requests]


- i want to use sqlite for now
- the backend is running on a windows laptop with wifi support
- i wnat all browser automation using playwright
- i want to use node, expressjs
- i want jwt cokie based auth and all routs need to be protected
- i want dangerous actions require admin rights

schema for tables (for now lets use raw sqlite)
    switch_nodes
        id primary_key
        switch_node_ip
        switch_node_mac
        routers [an array/list of ids of all the routers that are connected to this switch] im not sure about this one

    routers
        id primary_key
        manufacturer
        model
        country
        serial_number
        category [CAT1,CAT2,CAT3]
        power_status [on,off] default off
        switch_node_id [from switch_nodes table]
        position_in_switch [0-9]
        wireless_ssid_2.4ghz
        wireless_ssid_5ghz [optional]
        wireless_ssid_6ghz [optional]
        wireless_password

        admin_page_url
        admin_page_username [some routers dont use this]
        asmin_page_password

    users
        id primary_key
        email
        password_hash
        role [user,admin]

the endpoint provided by the node mcu wifi board that has 10 relays and it can turn on/off each relay based on a http get request sent to it

example http://192.168.1.177/D0/on?mac=DE:AD:BE:EF:FE:ED

explaination http://{switch_ip}/D{router_position_in_switch}/{power_status_change(on/off)}?mac={switch_mac}

## so the basic working principle is that 

i have a iot switch node mcu that has 10 relays connected to it and throught those 10 relays i can turn on off the corresponding routers
i need to be able to add switches add routers and users [only for admin]
the iot switch has a endpoint that exposes a way to turn on or off a particular router when it gets a http request with some data 
i want to make endpoints that enable me to 
1. turn on or off the router
2. to make the backend connect to that router using wifi [for 2.4GHz, 5GHz, 6GHz] [wireless ssid and password from db] (lets use netsh and xml profiles for now but i do want to explore other options later)
3. login to the router home page [admin_url, login_username, login_pass from  db]
4. change security parameters [wpa,wpa2,wpa3,etc]
5. connect back to the router after router restarts from security parameter change

i plan to write playwright scripts for all the diffrent routers manually and store them in a folder and call the appropreate functions

also suggest on logging each and every step/ change that happens into a logfile 
logfiles must persist 30 days and need to automatically overwrite old ones
