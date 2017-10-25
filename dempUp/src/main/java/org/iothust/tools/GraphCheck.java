package org.iothust.tools;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class GraphCheck {
    private int[] visited;
    private int n;
    private Boolean hasCycle = false;
    private ArrayList<Integer> trace = new ArrayList<>();
    private int e[][];

    public Boolean checkCycle(List<String> listTaskId, String[][] listPreTask) {
        // 初始化"顶点数"和"边数"
        int v = listTaskId.size();
        int length = listPreTask.length;

        //初始化起始位置
        e = new int[v][v];

        //初始化关系
        for (int i = 0; i < length; i++) {
            if (listPreTask[i] == null) {
                break;
            }
            String c1 = listPreTask[i][0];
            int c1p = getPosition(listTaskId, c1);
            for (int j = 1; j < listPreTask[i].length; j++) {
                String c2 = listPreTask[i][j];
                int c2p = getPosition(listTaskId, c2);
                e[c1p][c2p] = 1;
            }
        }

        this.n = e.length;
        visited = new int[n];
        Arrays.fill(visited, 0);
        findCycle(1);
        if (!hasCycle) {
            for (int i = 0; i < n; i++) {
                if (visited[i] == 0) {
                    findCycle(i);
                    if (hasCycle)
                        break;
                }
            }
        }
        return hasCycle;
    }


    private int getPosition(List<String> listTaskId, String ch) {
        for (int i = 0; i < listTaskId.size(); i++)
            if (listTaskId.get(i).equals(ch))
                return i;
        return -1;
    }

    //dfs递归
    void findCycle(int v) {
        if (visited[v] == -1) {
            int j;
            if ((j = trace.indexOf(v)) != -1) {
                hasCycle = true;
                System.out.println("Cycle:");
                while (j < trace.size()) {
                    System.out.println(trace.get(j) + "");
                    j++;
                }
                System.out.println("\n");
                return;
            }
            return;
        }
        trace.add(v);
        for (int i = 0; i < n; i++) {
            if (e[v][i] == 1) {
                visited[v] = -1;
                findCycle(i);
            }
        }
        visited[v] = 1;
        trace.remove(trace.size() - 1);
    }

//    public int[][] list(List<String> listTaskId, String[][] listPreTask) {
//
//        // 初始化"顶点数"和"边数"
//        int vlen = listTaskId.size();
//        int elen = listPreTask.length;
//
//        //初始化起始位置
//        int[][] e = new int[vlen][vlen];
//
//        //初始化关系
//        for (int i = 0; i < elen; i++) {
//            if (listPreTask[i]==null){
//                break;
//            }
//            String c1 = listPreTask[i][0];
//            int c1p = getPosition(listTaskId,c1);
//            for(int j=1;j<listPreTask[i].length;j++){
//                String c2 = listPreTask[i][j];
//                int c2p = getPosition(listTaskId,c2);
//                e[c1p][c2p]=1;
//            }
//        }
//        return e;
//    }


//    public Boolean graphIsCycle(int[][] tasks){
//        this.n = tasks.length;
//        visited=new int[n];
//        Arrays.fill(visited,0);
//        this.e=tasks;
//        findCycle(1);
//        if (!hasCycle) {
//            for (int i = 0; i < n; i++) {
//                if (visited[i] == 0) {
//                    findCycle(i);
//                    if (hasCycle)
//                        break;
//                }
//            }
//        }
//        return hasCycle;
//    }


}
