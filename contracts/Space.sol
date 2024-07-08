// // SPDX-License-Identifier: UNLICENSED
// pragma solidity ^0.8.24;

// import "hardhat/console.sol";

// contract Roles is ERC721 {
//   struct Role {
//     address space;
//     string label;
//   }

//   mapping(address user => uint[] roles) public useRoles;
//   mapping(address user => mapping(address space => uint[] roles)) public useRolesPerSpace;
//   Role[] public roles;
//   // admin functions to add remove/roles

//   function mint(address to, string memory label) public {
//     uint _id = roles.length;
//     roles.push(Role(msg.sender, label));
//     _mint(to, _id);
//   }
// }

// contract Space {

//     string public name;
//     string[] public roles;

//     struct File {
//         string id;
//         mapping(string label => string[] levels) rolePermissions;
//     }

//     constructor(adminLabel) {
//       uint id; string label = Roles.mint(msg.sender, adminLabel);
//       roles[adminLabel].push(label);
//     }

//     function addMember(address _addr, string role) public {
//         if (Roles.useRolesPerSpace[this.address][msg.sender].label === roles[]) {
//           Roles.mint(_addr, role);
//         }
//     }


//     address payable public owner;
//     address[] public members;
//     address public roleContract;

//     mapping(address => string[]) public userRoles;

//     mapping(string => File) public files;

//     constructor(string memory _name) {
//         console.log("Deploying a Space with name:", _name);
//         name = _name;
//     }

//     addMember(address _addr) public {
//         members.push(_addr);
//     }

//     addMemberRole(string _role, address _addr) public {
//         roles[_role].push(_addr);
//         userRoles[_addr].push(_role);
//     }

//     addFile(string _id, address _addr) public {
//         files[_id].addr = _addr;
//     }
// }
